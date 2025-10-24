import { ChevronDown } from 'lucide-react';

import { Cms } from '@kit/cms';
import { CollapsibleContent, CollapsibleTrigger } from '@kit/ui/collapsible';
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@kit/ui/shadcn-sidebar';

import { DocsNavLink } from '~/(marketing)/docs/_components/docs-nav-link';
import { DocsNavigationCollapsible } from '~/(marketing)/docs/_components/docs-navigation-collapsible';

import { FloatingDocumentationNavigation } from './floating-docs-navigation';

function Node({
  node,
  level,
  prefix,
}: {
  node: Cms.ContentItem;
  level: number;
  prefix: string;
}) {
  const url = `${prefix}/${node.slug}`;
  const label = node.label ? node.label : node.title;

  return (
    <NodeContainer node={node} prefix={prefix}>
      <NodeTrigger node={node} label={label} url={url} />

      <NodeContentContainer node={node}>
        <Tree pages={node.children ?? []} level={level + 1} prefix={prefix} />
      </NodeContentContainer>
    </NodeContainer>
  );
}

function NodeContentContainer({
  node,
  children,
}: {
  node: Cms.ContentItem;
  children: React.ReactNode;
}) {
  if (node.collapsible) {
    return <CollapsibleContent>{children}</CollapsibleContent>;
  }

  return children;
}

function NodeContainer({
  node,
  prefix,
  children,
}: {
  node: Cms.ContentItem;
  prefix: string;
  children: React.ReactNode;
}) {
  if (node.collapsible) {
    return (
      <DocsNavigationCollapsible node={node} prefix={prefix}>
        {children}
      </DocsNavigationCollapsible>
    );
  }

  return children;
}

function NodeTrigger({
  node,
  label,
  url,
}: {
  node: Cms.ContentItem;
  label: string;
  url: string;
}) {
  if (node.collapsible) {
    return (
      <CollapsibleTrigger asChild>
        <SidebarMenuItem>
          <SidebarMenuButton>
            {label}
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </CollapsibleTrigger>
    );
  }

  return <DocsNavLink label={label} url={url} />;
}

function Tree({
  pages,
  level,
  prefix,
}: {
  pages: Cms.ContentItem[];
  level: number;
  prefix: string;
}) {
  if (level === 0) {
    return pages.map((treeNode, index) => (
      <Node key={index} node={treeNode} level={level} prefix={prefix} />
    ));
  }

  if (pages.length === 0) {
    return null;
  }

  return (
    <SidebarMenuSub>
      {pages.map((treeNode, index) => (
        <Node key={index} node={treeNode} level={level} prefix={prefix} />
      ))}
    </SidebarMenuSub>
  );
}

export function DocsNavigation({
  pages,
  prefix = '/docs',
}: {
  pages: Cms.ContentItem[];
  prefix?: string;
}) {
  return (
    <>
      <Sidebar
        variant={'ghost'}
        className={
          'sticky z-1 mt-4 max-h-full overflow-y-auto border-r-transparent'
        }
      >
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Tree pages={pages} level={0} prefix={prefix} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </Sidebar>

      <div className={'lg:hidden'}>
        <FloatingDocumentationNavigation>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Tree pages={pages} level={0} prefix={prefix} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </FloatingDocumentationNavigation>
      </div>
    </>
  );
}
