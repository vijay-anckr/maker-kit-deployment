/*
 * -------------------------------------------------------
 * Section: Super Admin
 * We create the policies and functions to enforce super admin access
 * -------------------------------------------------------
 */

-- the following policies are applied to the tables as a permissive policy to ensure that
-- super admins can access all tables (view only).

-- Allow Super Admins to access the accounts table
create policy super_admins_access_accounts
    on public.accounts
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Allow Super Admins to access the accounts memberships table
create policy super_admins_access_accounts_memberships
    on public.accounts_memberships
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Allow Super Admins to access the subscriptions table
create policy super_admins_access_subscriptions
    on public.subscriptions
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Allow Super Admins to access the subscription items table
create policy super_admins_access_subscription_items
    on public.subscription_items
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Allow Super Admins to access the invitations items table
create policy super_admins_access_invitations
    on public.invitations
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Allow Super Admins to access the orders table
create policy super_admins_access_orders
    on public.orders
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Allow Super Admins to access the order items table
create policy super_admins_access_order_items
    on public.order_items
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());

-- Allow Super Admins to access the role permissions table
create policy super_admins_access_role_permissions
    on public.role_permissions
    as permissive
    for select
    to authenticated
    using (public.is_super_admin());