'use client';

import { CheckCircledIcon } from '@radix-ui/react-icons';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { useCaptcha } from '../captcha/client';
import { usePasswordSignUpFlow } from '../hooks/use-sign-up-flow';
import { AuthErrorAlert } from './auth-error-alert';
import { PasswordSignUpForm } from './password-sign-up-form';

interface EmailPasswordSignUpContainerProps {
  displayTermsCheckbox?: boolean;
  defaultValues?: {
    email: string;
  };
  onSignUp?: (userId?: string) => unknown;
  emailRedirectTo: string;
  captchaSiteKey?: string;
}

export function EmailPasswordSignUpContainer({
  defaultValues,
  onSignUp,
  emailRedirectTo,
  displayTermsCheckbox,
  captchaSiteKey,
}: EmailPasswordSignUpContainerProps) {
  const captcha = useCaptcha({ siteKey: captchaSiteKey });

  const {
    signUp: onSignupRequested,
    loading,
    error,
    showVerifyEmailAlert,
  } = usePasswordSignUpFlow({
    emailRedirectTo,
    onSignUp,
    captchaToken: captcha.token,
    resetCaptchaToken: captcha.reset,
  });

  return (
    <>
      <If condition={showVerifyEmailAlert}>
        <SuccessAlert />
      </If>

      <If condition={!showVerifyEmailAlert}>
        <AuthErrorAlert error={error} />

        {captcha.field}

        <PasswordSignUpForm
          onSubmit={onSignupRequested}
          loading={loading}
          defaultValues={defaultValues}
          displayTermsCheckbox={displayTermsCheckbox}
        />
      </If>
    </>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <CheckCircledIcon className={'w-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:emailConfirmationAlertHeading'} />
      </AlertTitle>

      <AlertDescription data-test={'email-confirmation-alert'}>
        <Trans i18nKey={'auth:emailConfirmationAlertBody'} />
      </AlertDescription>
    </Alert>
  );
}
