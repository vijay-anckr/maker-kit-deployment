'use client';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import { PasswordSignInSchema } from '../schemas/password-sign-in.schema';

export function PasswordSignInForm({
  onSubmit,
  loading = false,
  redirecting = false,
}: {
  onSubmit: (params: z.infer<typeof PasswordSignInSchema>) => unknown;
  loading: boolean;
  redirecting: boolean;
}) {
  const { t } = useTranslation('auth');

  const form = useForm<z.infer<typeof PasswordSignInSchema>>({
    resolver: zodResolver(PasswordSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form
        className={'flex w-full flex-col gap-y-4'}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name={'email'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey={'common:emailAddress'} />
              </FormLabel>

              <FormControl>
                <Input
                  data-test={'email-input'}
                  required
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={'password'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey={'common:password'} />
              </FormLabel>

              <FormControl>
                <Input
                  required
                  data-test={'password-input'}
                  type="password"
                  placeholder={''}
                  {...field}
                />
              </FormControl>

              <FormMessage />

              <div>
                <Button
                  asChild
                  type={'button'}
                  size={'sm'}
                  variant={'link'}
                  className={'text-xs'}
                >
                  <Link href={'/auth/password-reset'}>
                    <Trans i18nKey={'auth:passwordForgottenQuestion'} />
                  </Link>
                </Button>
              </div>
            </FormItem>
          )}
        />

        <Button
          data-test="auth-submit-button"
          className={'group w-full'}
          type="submit"
          disabled={loading || redirecting}
        >
          <If condition={redirecting}>
            <span className={'animate-in fade-in slide-in-from-bottom-24'}>
              <Trans i18nKey={'auth:redirecting'} />
            </span>
          </If>

          <If condition={loading}>
            <span className={'animate-in fade-in slide-in-from-bottom-24'}>
              <Trans i18nKey={'auth:signingIn'} />
            </span>
          </If>

          <If condition={!redirecting && !loading}>
            <span className={'animate-out fade-out flex items-center'}>
              <Trans i18nKey={'auth:signInWithEmail'} />

              <ArrowRight
                className={
                  'zoom-in animate-in slide-in-from-left-2 fill-mode-both h-4 delay-500 duration-500'
                }
              />
            </span>
          </If>
        </Button>
      </form>
    </Form>
  );
}
