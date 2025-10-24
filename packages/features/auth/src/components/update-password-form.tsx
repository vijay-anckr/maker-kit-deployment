'use client';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { z } from 'zod';

import { useUpdateUser } from '@kit/supabase/hooks/use-update-user-mutation';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Heading } from '@kit/ui/heading';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import { PasswordResetSchema } from '../schemas/password-reset.schema';

export function UpdatePasswordForm(params: {
  redirectTo: string;
  heading?: React.ReactNode;
}) {
  const updateUser = useUpdateUser();
  const router = useRouter();
  const { t } = useTranslation();

  const form = useForm<z.infer<typeof PasswordResetSchema>>({
    resolver: zodResolver(PasswordResetSchema),
    defaultValues: {
      password: '',
      repeatPassword: '',
    },
  });

  if (updateUser.error) {
    const error = updateUser.error as unknown as { code: string };

    return <ErrorState error={error} onRetry={() => updateUser.reset()} />;
  }

  return (
    <div className={'flex w-full flex-col space-y-6'}>
      <div className={'flex justify-center'}>
        {params.heading && (
          <Heading className={'text-center'} level={4}>
            {params.heading}
          </Heading>
        )}
      </div>

      <Form {...form}>
        <form
          className={'flex w-full flex-1 flex-col'}
          onSubmit={form.handleSubmit(async ({ password }) => {
            await updateUser.mutateAsync({
              password,
              redirectTo: params.redirectTo,
            });

            router.replace(params.redirectTo);

            toast.success(t('account:updatePasswordSuccessMessage'));
          })}
        >
          <div className={'flex-col space-y-4'}>
            <FormField
              name={'password'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'common:password'} />
                  </FormLabel>

                  <FormControl>
                    <Input
                      required
                      type="password"
                      autoComplete={'new-password'}
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={'repeatPassword'}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey={'common:repeatPassword'} />
                  </FormLabel>

                  <FormControl>
                    <Input required type="password" {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={updateUser.isPending}
              type="submit"
              className={'w-full'}
            >
              <Trans i18nKey={'auth:passwordResetLabel'} />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function ErrorState(props: {
  onRetry: () => void;
  error: {
    code: string;
  };
}) {
  const { t } = useTranslation('auth');

  const errorMessage = t(`errors.${props.error.code}`, {
    defaultValue: t('errors.resetPasswordError'),
  });

  return (
    <div className={'flex flex-col space-y-4'}>
      <Alert variant={'destructive'}>
        <ExclamationTriangleIcon className={'s-6'} />

        <AlertTitle>
          <Trans i18nKey={'common:genericError'} />
        </AlertTitle>

        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>

      <Button onClick={props.onRetry} variant={'outline'}>
        <Trans i18nKey={'common:retry'} />
      </Button>
    </div>
  );
}
