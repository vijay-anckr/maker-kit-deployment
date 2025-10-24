import 'server-only';

import { cache } from 'react';

import { cookies, headers } from 'next/headers';

import { z } from 'zod';

import {
  initializeServerI18n,
  parseAcceptLanguageHeader,
} from '@kit/i18n/server';

import featuresFlagConfig from '~/config/feature-flags.config';
import {
  I18N_COOKIE_NAME,
  getI18nSettings,
  languages,
} from '~/lib/i18n/i18n.settings';

import { i18nResolver } from './i18n.resolver';

/**
 * @name priority
 * @description The language priority setting from the feature flag configuration.
 */
const priority = featuresFlagConfig.languagePriority;

/**
 * @name createI18nServerInstance
 * @description Creates an instance of the i18n server.
 * It uses the language from the cookie if it exists, otherwise it uses the language from the accept-language header.
 * If neither is available, it will default to the provided environment variable.
 *
 * Initialize the i18n instance for every RSC server request (eg. each page/layout)
 */
async function createInstance() {
  const cookieStore = await cookies();
  const langCookieValue = cookieStore.get(I18N_COOKIE_NAME)?.value;

  let selectedLanguage: string | undefined = undefined;

  // if the cookie is set, use the language from the cookie
  if (langCookieValue) {
    selectedLanguage = getLanguageOrFallback(langCookieValue);
  }

  // if not, check if the language priority is set to user and
  // use the user's preferred language
  if (!selectedLanguage && priority === 'user') {
    const userPreferredLanguage = await getPreferredLanguageFromBrowser();

    selectedLanguage = getLanguageOrFallback(userPreferredLanguage);
  }

  const settings = getI18nSettings(selectedLanguage);

  return initializeServerI18n(settings, i18nResolver);
}

export const createI18nServerInstance = cache(createInstance);

/**
 * @name getPreferredLanguageFromBrowser
 * Get the user's preferred language from the accept-language header.
 */
async function getPreferredLanguageFromBrowser() {
  const headersStore = await headers();
  const acceptLanguage = headersStore.get('accept-language');

  // no accept-language header, return
  if (!acceptLanguage) {
    return;
  }

  return parseAcceptLanguageHeader(acceptLanguage, languages)[0];
}

/**
 * @name getLanguageOrFallback
 * Get the language or fallback to the default language.
 * @param selectedLanguage
 */
function getLanguageOrFallback(selectedLanguage: string | undefined) {
  const language = z
    .enum(languages as [string, ...string[]])
    .safeParse(selectedLanguage);

  if (language.success) {
    return language.data;
  }

  console.warn(
    `The language passed is invalid. Defaulted back to "${languages[0]}"`,
  );

  return languages[0];
}
