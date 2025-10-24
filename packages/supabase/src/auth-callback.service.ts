import 'server-only';

import {
  AuthError,
  type EmailOtpType,
  SupabaseClient,
} from '@supabase/supabase-js';

/**
 * @name createAuthCallbackService
 * @description Creates an instance of the AuthCallbackService
 * @param client
 */
export function createAuthCallbackService(client: SupabaseClient) {
  return new AuthCallbackService(client);
}

/**
 * @name AuthCallbackService
 * @description Service for handling auth callbacks in Supabase
 */
class AuthCallbackService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * @name verifyTokenHash
   * @description Verifies the token hash and type and redirects the user to the next page
   * This should be used when using a token hash to verify the user's email
   * @param request
   * @param params
   */
  async verifyTokenHash(
    request: Request,
    params: {
      joinTeamPath: string;
      redirectPath: string;
      errorPath?: string;
    },
  ): Promise<URL> {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const host = request.headers.get('host');

    // set the host to the request host since outside of Vercel it gets set as "localhost" or "0.0.0.0"
    this.adjustUrlHostForLocalDevelopment(url, host);

    url.pathname = params.redirectPath;

    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;

    const redirectInfo = this.parseRedirectDestination(
      searchParams.get('next') ?? searchParams.get('callback'),
    );

    let nextPath: string | null = null;

    // if we have a valid redirect destination
    if (redirectInfo) {
      nextPath = redirectInfo.path;

      // preserve any query params from the redirect URL (e.g., invite_token)
      // but exclude 'next' to avoid duplication
      redirectInfo.params.forEach((value, key) => {
        if (key !== 'next') {
          url.searchParams.set(key, value);
        }
      });
    }

    const errorPath = params.errorPath ?? '/auth/callback/error';

    // remove the query params from the url
    searchParams.delete('token_hash');
    searchParams.delete('next');

    // if we have a next path, we redirect to that path
    if (nextPath) {
      url.pathname = nextPath;
    }

    if (token_hash && type) {
      const { error } = await this.client.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        return url;
      }

      if (error.code) {
        url.searchParams.set('code', error.code);
      }

      const errorMessage = getAuthErrorMessage({
        error: error.message,
        code: error.code,
      });

      url.searchParams.set('error', errorMessage);
    }

    // return the user to an error page with some instructions
    url.pathname = errorPath;

    return url;
  }

  /**
   * @name exchangeCodeForSession
   * @description Exchanges the auth code for a session and redirects the user to the next page or an error page
   * @param request
   * @param params
   */
  async exchangeCodeForSession(
    request: Request,
    params: {
      joinTeamPath: string;
      redirectPath: string;
      errorPath?: string;
    },
  ): Promise<{
    nextPath: string;
  }> {
    const requestUrl = new URL(request.url);
    const searchParams = requestUrl.searchParams;

    const authCode = searchParams.get('code');
    const error = searchParams.get('error');
    const nextUrlPathFromParams = searchParams.get('next');
    const errorPath = params.errorPath ?? '/auth/callback/error';

    const nextUrl = nextUrlPathFromParams ?? params.redirectPath;

    if (authCode) {
      try {
        const { error } =
          await this.client.auth.exchangeCodeForSession(authCode);

        // if we have an error, we redirect to the error page
        if (error) {
          return onError({
            code: error.code,
            error: error.message,
            path: errorPath,
          });
        }
      } catch (error) {
        console.error(
          {
            error,
            name: `auth.callback`,
          },
          `An error occurred while exchanging code for session`,
        );

        const message = error instanceof Error ? error.message : error;

        return onError({
          code: (error as AuthError)?.code,
          error: message as string,
          path: errorPath,
        });
      }
    }

    if (error) {
      return onError({
        error,
        path: errorPath,
      });
    }

    return {
      nextPath: nextUrl,
    };
  }

  private adjustUrlHostForLocalDevelopment(url: URL, host: string | null) {
    if (host && this.isLocalhost(url.host) && !this.isLocalhost(host)) {
      url.host = host;
      url.port = '';
    }
  }

  /**
   * Parses a redirect URL and extracts the destination path and query params
   * Handles nested 'next' parameters for chained redirects
   */
  private parseRedirectDestination(redirectParam: string | null): {
    path: string;
    params: URLSearchParams;
  } | null {
    if (!redirectParam) {
      return null;
    }

    try {
      const redirectUrl = new URL(redirectParam);

      // check for nested 'next' parameter (chained redirect)
      const nestedNext = redirectUrl.searchParams.get('next');

      if (nestedNext) {
        // use the nested path as the final destination
        return {
          path: nestedNext,
          params: redirectUrl.searchParams,
        };
      }

      // no nested redirect, use the pathname directly
      return {
        path: redirectUrl.pathname,
        params: redirectUrl.searchParams,
      };
    } catch {
      // invalid URL, ignore
      return null;
    }
  }

  private isLocalhost(host: string | null) {
    if (!host) {
      return false;
    }

    return (
      host.includes('localhost:') ||
      host.includes('0.0.0.0:') ||
      host.includes('127.0.0.1:')
    );
  }
}

function onError({
  error,
  path,
  code,
}: {
  error: string;
  path: string;
  code?: string;
}) {
  const errorMessage = getAuthErrorMessage({ error, code });

  console.error(
    {
      error: JSON.stringify(error).replace(/["\\]/g, '\\$&'),
      name: `auth.callback`,
    },
    `An error occurred while signing user in`,
  );

  const searchParams = new URLSearchParams({
    error: errorMessage,
    code: code ?? '',
  });

  const nextPath = `${path}?${searchParams.toString()}`;

  return {
    nextPath,
  };
}

/**
 * Checks if the given error message indicates a verifier error.
 * We check for this specific error because it's highly likely that the
 * user is trying to sign in using a different browser than the one they
 * used to request the sign in link. This is a common mistake, so we
 * want to provide a helpful error message.
 */
function isVerifierError(error: string) {
  return error.includes('both auth code and code verifier should be non-empty');
}

function getAuthErrorMessage(params: { error: string; code?: string }) {
  // this error arises when the user tries to sign in with an expired email link
  if (params.code) {
    if (params.code === 'otp_expired') {
      return 'auth:errors.otp_expired';
    }
  }

  // this error arises when the user is trying to sign in with a different
  // browser than the one they used to request the sign in link
  if (isVerifierError(params.error)) {
    return 'auth:errors.codeVerifierMismatch';
  }

  // fallback to the default error message
  return `auth:authenticationErrorAlertBody`;
}
