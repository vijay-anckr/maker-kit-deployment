'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { JWTUserData } from '@kit/supabase/types';

import { AcceptInvitationSchema } from '../../schema/accept-invitation.schema';
import { DeleteInvitationSchema } from '../../schema/delete-invitation.schema';
import { InviteMembersSchema } from '../../schema/invite-members.schema';
import { RenewInvitationSchema } from '../../schema/renew-invitation.schema';
import { UpdateInvitationSchema } from '../../schema/update-invitation.schema';
import { createInvitationContextBuilder } from '../policies/invitation-context-builder';
import { createInvitationsPolicyEvaluator } from '../policies/invitation-policies';
import { createAccountInvitationsService } from '../services/account-invitations.service';
import { createAccountPerSeatBillingService } from '../services/account-per-seat-billing.service';

/**
 * @name createInvitationsAction
 * @description Creates invitations for inviting members.
 */
export const createInvitationsAction = enhanceAction(
  async (params, user) => {
    const logger = await getLogger();

    logger.info(
      { params, userId: user.id },
      'User requested to send invitations',
    );

    // Evaluate invitation policies
    const policiesResult = await evaluateInvitationsPolicies(params, user);

    // If the invitations are not allowed, throw an error
    if (!policiesResult.allowed) {
      logger.info(
        { reasons: policiesResult?.reasons, userId: user.id },
        'Invitations blocked by policies',
      );

      return {
        success: false,
        reasons: policiesResult?.reasons,
      };
    }

    // invitations are allowed, so continue with the action
    const client = getSupabaseServerClient();
    const service = createAccountInvitationsService(client);

    try {
      await service.sendInvitations(params);

      revalidateMemberPage();

      return {
        success: true,
      };
    } catch {
      return {
        success: false,
      };
    }
  },
  {
    schema: InviteMembersSchema.and(
      z.object({
        accountSlug: z.string().min(1),
      }),
    ),
  },
);

/**
 * @name deleteInvitationAction
 * @description Deletes an invitation specified by the invitation ID.
 */
export const deleteInvitationAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const service = createAccountInvitationsService(client);

    // Delete the invitation
    await service.deleteInvitation(data);

    revalidateMemberPage();

    return {
      success: true,
    };
  },
  {
    schema: DeleteInvitationSchema,
  },
);

/**
 * @name updateInvitationAction
 * @description Updates an invitation.
 */
export const updateInvitationAction = enhanceAction(
  async (invitation) => {
    const client = getSupabaseServerClient();
    const service = createAccountInvitationsService(client);

    await service.updateInvitation(invitation);

    revalidateMemberPage();

    return {
      success: true,
    };
  },
  {
    schema: UpdateInvitationSchema,
  },
);

/**
 * @name acceptInvitationAction
 * @description Accepts an invitation to join a team.
 */
export const acceptInvitationAction = enhanceAction(
  async (data: FormData, user) => {
    const client = getSupabaseServerClient();

    const { inviteToken, nextPath } = AcceptInvitationSchema.parse(
      Object.fromEntries(data),
    );

    // create the services
    const perSeatBillingService = createAccountPerSeatBillingService(client);
    const service = createAccountInvitationsService(client);

    // use admin client to accept invitation
    const adminClient = getSupabaseServerAdminClient();

    // Accept the invitation
    const accountId = await service.acceptInvitationToTeam(adminClient, {
      inviteToken,
      userId: user.id,
      userEmail: user.email,
    });

    // If the account ID is not present, throw an error
    if (!accountId) {
      throw new Error('Failed to accept invitation');
    }

    // Increase the seats for the account
    await perSeatBillingService.increaseSeats(accountId);

    return redirect(nextPath);
  },
  {},
);

/**
 * @name renewInvitationAction
 * @description Renews an invitation.
 */
export const renewInvitationAction = enhanceAction(
  async (params) => {
    const client = getSupabaseServerClient();
    const { invitationId } = RenewInvitationSchema.parse(params);

    const service = createAccountInvitationsService(client);

    // Renew the invitation
    await service.renewInvitation(invitationId);

    revalidateMemberPage();

    return {
      success: true,
    };
  },
  {
    schema: RenewInvitationSchema,
  },
);

function revalidateMemberPage() {
  revalidatePath('/home/[account]/members', 'page');
}

/**
 * @name evaluateInvitationsPolicies
 * @description Evaluates invitation policies with performance optimization.
 * @param params - The invitations to evaluate (emails and roles).
 */
async function evaluateInvitationsPolicies(
  params: z.infer<typeof InviteMembersSchema> & { accountSlug: string },
  user: JWTUserData,
) {
  const evaluator = createInvitationsPolicyEvaluator();
  const hasPolicies = await evaluator.hasPoliciesForStage('submission');

  // No policies to evaluate, skip
  if (!hasPolicies) {
    return {
      allowed: true,
      reasons: [],
    };
  }

  const client = getSupabaseServerClient();
  const builder = createInvitationContextBuilder(client);
  const context = await builder.buildContext(params, user);

  return evaluator.canInvite(context, 'submission');
}
