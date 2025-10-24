import { expect, test } from '@playwright/test';

import { InvitationsPageObject } from './invitations.po';

test.describe('Invitations', () => {
  let invitations: InvitationsPageObject;

  test.beforeEach(async ({ page }) => {
    invitations = new InvitationsPageObject(page);

    await invitations.setup();
  });

  test('users can delete invites', async () => {
    await invitations.navigateToMembers();
    await invitations.openInviteForm();

    const email = invitations.auth.createRandomEmail();

    const invites = [
      {
        email,
        role: 'member',
      },
    ];

    await invitations.inviteMembers(invites);

    await expect(invitations.getInvitations()).toHaveCount(1);

    await invitations.deleteInvitation(email);

    await expect(invitations.getInvitations()).toHaveCount(0);
  });

  test('users can update invites', async () => {
    await invitations.navigateToMembers();
    await invitations.openInviteForm();

    const email = invitations.auth.createRandomEmail();

    const invites = [
      {
        email,
        role: 'member',
      },
    ];

    await invitations.inviteMembers(invites);

    await expect(invitations.getInvitations()).toHaveCount(1);

    await invitations.updateInvitation(email, 'owner');

    const row = invitations.getInvitationRow(email);

    await expect(row.locator('[data-test="member-role-badge"]')).toHaveText(
      'Owner',
    );
  });

  test('user cannot invite a member of the team again', async ({ page }) => {
    await invitations.navigateToMembers();

    const email = invitations.auth.createRandomEmail();

    const invites = [
      {
        email,
        role: 'member',
      },
    ];

    await invitations.openInviteForm();
    await invitations.inviteMembers(invites);

    await expect(invitations.getInvitations()).toHaveCount(1);

    // Try to invite the same member again
    // This should fail
    await invitations.openInviteForm();
    await invitations.inviteMembers(invites);
    await page.waitForTimeout(500);
    await expect(invitations.getInvitations()).toHaveCount(1);
  });
});

test.describe('Full Invitation Flow', () => {
  test('should invite users and let users accept an invite', async ({
    page,
  }) => {
    const invitations = new InvitationsPageObject(page);
    await invitations.setup();

    await invitations.navigateToMembers();

    const invites = [
      {
        email: invitations.auth.createRandomEmail(),
        role: 'member',
      },
      {
        email: invitations.auth.createRandomEmail(),
        role: 'member',
      },
    ];

    await invitations.openInviteForm();
    await invitations.inviteMembers(invites);

    const firstEmail = invites[0]!.email;

    await expect(invitations.getInvitations()).toHaveCount(2);

    // sign out and sign in with the first email
    await page.context().clearCookies();
    await page.reload();

    console.log(`Finding email to ${firstEmail} ...`);

    await invitations.auth.visitConfirmEmailLink(firstEmail);

    console.log(`Accepting invitation as ${firstEmail}`);

    await invitations.acceptInvitation();

    await invitations.teamAccounts.openAccountsSelector();

    await expect(invitations.teamAccounts.getTeams()).toHaveCount(1);
  });
});
