import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../authentication/auth.po';
import { InvitationsPageObject } from '../invitations/invitations.po';
import { TeamAccountsPageObject } from './team-accounts.po';

test.describe('Team Invitation with MFA Flow', () => {
  test('complete flow: test@makerkit.dev creates team, invites super-admin@makerkit.dev who accepts after MFA', async ({
    page,
  }) => {
    const auth = new AuthPageObject(page);
    const teamAccounts = new TeamAccountsPageObject(page);
    const invitations = new InvitationsPageObject(page);

    await auth.loginAsUser({
      email: 'owner@makerkit.dev',
    });

    const teamName = `test-team-${Math.random().toString(36).substring(2, 15)}`;
    const teamSlug = teamName.toLowerCase().replace(/ /g, '-');

    // Create a new team
    await teamAccounts.createTeam({
      teamName,
      slug: teamSlug,
    });

    // Navigate to members section and invite super-admin
    await invitations.navigateToMembers();
    await invitations.openInviteForm();

    await invitations.inviteMembers([
      {
        email: 'super-admin@makerkit.dev',
        role: 'member',
      },
    ]);

    // Verify invitation was sent
    await expect(invitations.getInvitations()).toHaveCount(1);

    const invitationRow = invitations.getInvitationRow(
      'super-admin@makerkit.dev',
    );

    await expect(invitationRow).toBeVisible();

    await expect(async () => {
      // Sign out test@makerkit.dev
      await auth.signOut();

      await page.waitForURL('/', {
        timeout: 5_000,
      });
    }).toPass();

    await auth.visitConfirmEmailLink('super-admin@makerkit.dev');

    // Complete MFA verification
    await expect(async () => {
      await auth.submitMFAVerification(AuthPageObject.MFA_KEY);
    }).toPass({
      intervals: [
        500, 2500, 5000, 7500, 10_000, 15_000, 20_000, 25_000, 30_000, 35_000,
        40_000, 45_000, 50_000,
      ],
    });

    // Step 3: Verify team invitation is visible and accept it
    // Accept the team invitation
    await invitations.acceptInvitation();

    // Should be redirected to the team dashboard
    await page.waitForURL(`/home/${teamSlug}`, {
      timeout: 5_000,
    });

    // Step 4: Verify membership was successful
    // Open account selector to verify team is available
    await teamAccounts.openAccountsSelector();

    const team = teamAccounts.getTeamFromSelector(teamName);

    await expect(team).toBeVisible();
  });
});
