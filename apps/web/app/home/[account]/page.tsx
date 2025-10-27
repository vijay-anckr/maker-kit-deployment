import { use } from 'react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { DashboardDemo } from './_components/dashboard-demo';
import { TeamAccountLayoutPageHeader } from './_components/team-account-layout-page-header';
import { ChatInterface } from '~/components/chat-interface';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('teams:home.pageTitle');

  return {
    title,
  };
};

function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const account = use(params).account;

  return (
    <>
      <TeamAccountLayoutPageHeader
        account={account}
        title={<Trans i18nKey={'common:routes.dashboard'} />}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <DashboardDemo />

        <div className="container mx-auto px-4 py-8 max-w-4xl mt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              <Trans i18nKey={'common:aiAssistant'} defaults="AI Assistant" />
            </h2>
            <p className="text-muted-foreground">
              <Trans
                i18nKey={'common:aiAssistantDescription'}
                defaults="Chat with our AI assistant to get help, answers, or just have a conversation."
              />
            </p>
          </div>

          <ChatInterface />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(TeamAccountHomePage);
