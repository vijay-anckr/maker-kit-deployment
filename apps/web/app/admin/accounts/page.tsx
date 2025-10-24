import { ServerDataLoader } from '@makerkit/data-loader-supabase-nextjs';

import { AdminAccountsTable } from '@kit/admin/components/admin-accounts-table';
import { AdminCreateUserDialog } from '@kit/admin/components/admin-create-user-dialog';
import { AdminGuard } from '@kit/admin/components/admin-guard';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';

interface SearchParams {
  page?: string;
  account_type?: 'all' | 'team' | 'personal';
  query?: string;
}

interface AdminAccountsPageProps {
  searchParams: Promise<SearchParams>;
}

export const metadata = {
  title: `Accounts`,
};

async function AccountsPage(props: AdminAccountsPageProps) {
  const client = getSupabaseServerClient();
  const searchParams = await props.searchParams;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;

  return (
    <>
      <PageHeader description={<AppBreadcrumbs />}>
        <div className="flex justify-end">
          <AdminCreateUserDialog>
            <Button data-test="admin-create-user-button">Create User</Button>
          </AdminCreateUserDialog>
        </div>
      </PageHeader>

      <PageBody>
        <ServerDataLoader
          table={'accounts'}
          client={client}
          page={page}
          where={(queryBuilder) => {
            const { account_type: type, query } = searchParams;

            if (type && type !== 'all') {
              queryBuilder.eq('is_personal_account', type === 'personal');
            }

            if (query) {
              queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
            }

            return queryBuilder;
          }}
        >
          {({ data, page, pageSize, pageCount }) => {
            return (
              <AdminAccountsTable
                page={page}
                pageSize={pageSize}
                pageCount={pageCount}
                data={data}
                filters={{
                  type: searchParams.account_type ?? 'all',
                  query: searchParams.query ?? '',
                }}
              />
            );
          }}
        </ServerDataLoader>
      </PageBody>
    </>
  );
}

export default AdminGuard(AccountsPage);
