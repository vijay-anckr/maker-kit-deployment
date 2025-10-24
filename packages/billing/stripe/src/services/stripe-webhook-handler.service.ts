import type Stripe from 'stripe';

import { BillingWebhookHandlerService, PlanTypeMap } from '@kit/billing';
import { getLogger } from '@kit/shared/logger';
import { Database, Enums } from '@kit/supabase/database';

import { StripeServerEnvSchema } from '../schema/stripe-server-env.schema';
import { createStripeClient } from './stripe-sdk';
import { createStripeSubscriptionPayloadBuilderService } from './stripe-subscription-payload-builder.service';

type UpsertSubscriptionParams =
  Database['public']['Functions']['upsert_subscription']['Args'] & {
    line_items: Array<LineItem>;
  };

interface LineItem {
  id: string;
  quantity: number;
  subscription_id: string;
  subscription_item_id: string;
  product_id: string;
  variant_id: string;
  price_amount: number | null | undefined;
  interval: string;
  interval_count: number;
  type: 'flat' | 'metered' | 'per_seat' | undefined;
}

type UpsertOrderParams =
  Database['public']['Functions']['upsert_order']['Args'];

type BillingProvider = Enums<'billing_provider'>;

export class StripeWebhookHandlerService
  implements BillingWebhookHandlerService
{
  private stripe: Stripe | undefined;

  constructor(private readonly planTypesMap: PlanTypeMap) {}

  private readonly provider: BillingProvider = 'stripe';

  private readonly namespace = 'billing.stripe';

  /**
   * @name verifyWebhookSignature
   * @description Verifies the webhook signature - should throw an error if the signature is invalid
   */
  async verifyWebhookSignature(request: Request) {
    const body = await request.clone().text();
    const signatureKey = `stripe-signature`;
    const signature = request.headers.get(signatureKey)!;

    const { webhooksSecret } = StripeServerEnvSchema.parse({
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhooksSecret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    const stripe = await this.loadStripe();

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhooksSecret,
    );

    if (!event) {
      throw new Error('Invalid signature');
    }

    return event;
  }

  /**
   * @name handleWebhookEvent
   * @description Handle the webhook event from the billing provider
   * @param event
   * @param params
   */
  async handleWebhookEvent(
    event: Stripe.Event,
    params: {
      onCheckoutSessionCompleted: (
        data: UpsertSubscriptionParams | UpsertOrderParams,
      ) => Promise<unknown>;
      onSubscriptionUpdated: (
        data: UpsertSubscriptionParams,
      ) => Promise<unknown>;
      onSubscriptionDeleted: (subscriptionId: string) => Promise<unknown>;
      onPaymentSucceeded: (sessionId: string) => Promise<unknown>;
      onPaymentFailed: (sessionId: string) => Promise<unknown>;
      onInvoicePaid: (data: UpsertSubscriptionParams) => Promise<unknown>;
      onEvent?(event: Stripe.Event): Promise<unknown>;
    },
  ) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const result = await this.handleCheckoutSessionCompleted(
          event,
          params.onCheckoutSessionCompleted,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'customer.subscription.updated': {
        const result = await this.handleSubscriptionUpdatedEvent(
          event,
          params.onSubscriptionUpdated,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'customer.subscription.deleted': {
        const result = await this.handleSubscriptionDeletedEvent(
          event,
          params.onSubscriptionDeleted,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'checkout.session.async_payment_failed': {
        const result = await this.handleAsyncPaymentFailed(
          event,
          params.onPaymentFailed,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'checkout.session.async_payment_succeeded': {
        const result = await this.handleAsyncPaymentSucceeded(
          event,
          params.onPaymentSucceeded,
        );

        // handle user-supplied handler
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      case 'invoice.paid': {
        const result = await this.handleInvoicePaid(
          event,
          params.onInvoicePaid,
        );

        // handle user-supplied handler (ex. user wanting to handle one-off payments)
        if (params.onEvent) {
          await params.onEvent(event);
        }

        return result;
      }

      default: {
        // when none of the events were matched, attempt to call
        // the user-supplied handler
        if (params.onEvent) {
          return params.onEvent(event);
        }

        const logger = await getLogger();

        logger.debug(
          {
            eventType: event.type,
            name: this.namespace,
          },
          `Unhandled Stripe event type: ${event.type}`,
        );

        return;
      }
    }
  }

  private async handleCheckoutSessionCompleted(
    event: Stripe.CheckoutSessionCompletedEvent,
    onCheckoutCompletedCallback: (
      data: UpsertSubscriptionParams | UpsertOrderParams,
    ) => Promise<unknown>,
  ) {
    const stripe = await this.loadStripe();

    const session = event.data.object;
    const isSubscription = session.mode === 'subscription';

    const accountId = session.client_reference_id!;
    const customerId = session.customer as string;

    // if it's a subscription, we need to retrieve the subscription
    // and build the payload for the subscription
    if (isSubscription) {
      const subscriptionPayloadBuilderService =
        createStripeSubscriptionPayloadBuilderService();

      const subscriptionId = session.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const periodStartsAt =
        subscriptionPayloadBuilderService.getPeriodStartsAt(subscription);

      const periodEndsAt =
        subscriptionPayloadBuilderService.getPeriodEndsAt(subscription);

      const lineItems = this.getLineItems(subscription);

      const payload = subscriptionPayloadBuilderService.build({
        accountId,
        customerId,
        id: subscription.id,
        lineItems,
        status: subscription.status,
        currency: subscription.currency,
        periodStartsAt,
        periodEndsAt,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialStartsAt: subscription.trial_start,
        trialEndsAt: subscription.trial_end,
      });

      return onCheckoutCompletedCallback(payload);
    } else {
      // if it's a one-time payment, we need to retrieve the session
      const sessionId = event.data.object.id;

      // from the session, we need to retrieve the line items
      const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
        event.data.object.id,
        {
          expand: ['line_items'],
        },
      );

      const lineItems = sessionWithLineItems.line_items?.data ?? [];
      const paymentStatus = sessionWithLineItems.payment_status;
      const status = paymentStatus === 'unpaid' ? 'pending' : 'succeeded';
      const currency = event.data.object.currency as string;

      const payload: UpsertOrderParams = {
        target_account_id: accountId,
        target_customer_id: customerId,
        target_order_id: sessionId,
        billing_provider: this.provider,
        status: status,
        currency: currency,
        total_amount: sessionWithLineItems.amount_total ?? 0,
        line_items: lineItems.map((item) => {
          const price = item.price as Stripe.Price;

          return {
            id: item.id,
            product_id: price.product as string,
            variant_id: price.id,
            price_amount: price.unit_amount,
            quantity: item.quantity,
          };
        }),
      };

      return onCheckoutCompletedCallback(payload);
    }
  }

  private handleAsyncPaymentFailed(
    event: Stripe.CheckoutSessionAsyncPaymentFailedEvent,
    onPaymentFailed: (sessionId: string) => Promise<unknown>,
  ) {
    const sessionId = event.data.object.id;

    return onPaymentFailed(sessionId);
  }

  private handleAsyncPaymentSucceeded(
    event: Stripe.CheckoutSessionAsyncPaymentSucceededEvent,
    onPaymentSucceeded: (sessionId: string) => Promise<unknown>,
  ) {
    const sessionId = event.data.object.id;

    return onPaymentSucceeded(sessionId);
  }

  private async handleSubscriptionUpdatedEvent(
    event: Stripe.CustomerSubscriptionUpdatedEvent,
    onSubscriptionUpdatedCallback: (
      subscription: UpsertSubscriptionParams,
    ) => Promise<unknown>,
  ) {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const accountId = subscription.metadata.accountId as string;

    const subscriptionPayloadBuilderService =
      createStripeSubscriptionPayloadBuilderService();

    const periodStartsAt =
      subscriptionPayloadBuilderService.getPeriodStartsAt(subscription);

    const periodEndsAt =
      subscriptionPayloadBuilderService.getPeriodEndsAt(subscription);

    const lineItems = this.getLineItems(subscription);

    const payload = subscriptionPayloadBuilderService.build({
      customerId: subscription.customer as string,
      id: subscriptionId,
      accountId,
      lineItems,
      status: subscription.status,
      currency: subscription.currency,
      periodStartsAt,
      periodEndsAt,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialStartsAt: subscription.trial_start,
      trialEndsAt: subscription.trial_end,
    });

    return onSubscriptionUpdatedCallback(payload);
  }

  private handleSubscriptionDeletedEvent(
    event: Stripe.CustomerSubscriptionDeletedEvent,
    onSubscriptionDeletedCallback: (subscriptionId: string) => Promise<unknown>,
  ) {
    // Here we don't need to do anything, so we just return the callback

    return onSubscriptionDeletedCallback(event.data.object.id);
  }

  private async handleInvoicePaid(
    event: Stripe.InvoicePaidEvent,
    onInvoicePaid: (data: UpsertSubscriptionParams) => Promise<unknown>,
  ) {
    const stripe = await this.loadStripe();
    const logger = await getLogger();

    const subscriptionPayloadBuilderService =
      createStripeSubscriptionPayloadBuilderService();

    const invoice = event.data.object;
    const invoiceId = invoice.id;

    if (!invoiceId) {
      logger.warn(
        {
          invoiceId,
        },
        `Invoice not found. Will not handle invoice.paid event.`,
      );

      return;
    }

    const customerId = invoice.customer as string;

    let subscriptionId: string | undefined;

    // for retro-compatibility with Stripe < 18
    // we check if the invoice object has a "subscription" property
    if ('subscription' in invoice && invoice.subscription) {
      subscriptionId = invoice.subscription as string;
    } else {
      // for Stripe 18+ we retrieve the subscription ID from the parent object
      subscriptionId = invoice.parent?.subscription_details
        ?.subscription as string;
    }

    // handle when a subscription ID is not found
    if (!subscriptionId) {
      logger.warn(
        {
          subscriptionId,
          customerId,
        },
        `Subscription ID not found for invoice. Will not handle invoice.paid event.`,
      );

      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // // handle when a subscription is not found
    if (!subscription) {
      logger.warn(
        {
          subscriptionId,
          customerId,
        },
        `Subscription not found for invoice. Will not handle invoice.paid event.`,
      );

      return;
    }

    // retrieve account ID from the metadata
    const accountId = subscription.metadata?.accountId as string;

    const periodStartsAt =
      subscriptionPayloadBuilderService.getPeriodStartsAt(subscription);

    const periodEndsAt =
      subscriptionPayloadBuilderService.getPeriodEndsAt(subscription);

    const lineItems = this.getLineItems(subscription);

    const payload = subscriptionPayloadBuilderService.build({
      customerId,
      id: subscriptionId,
      accountId,
      lineItems,
      status: subscription.status,
      currency: subscription.currency,
      periodStartsAt,
      periodEndsAt,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialStartsAt: subscription.trial_start,
      trialEndsAt: subscription.trial_end,
    });

    return onInvoicePaid(payload);
  }

  private getLineItems(subscription: Stripe.Subscription) {
    return subscription.items.data.map((item) => {
      let type = this.planTypesMap.get(item.price.id);

      if (!type) {
        console.warn(
          {
            lineItemId: item.id,
          },
          `Line item is not in the billing configuration, please add it. Defaulting to "flat" type.`,
        );

        type = 'flat' as const;
      }

      return { ...item, type };
    });
  }

  private async loadStripe() {
    if (!this.stripe) {
      this.stripe = await createStripeClient();
    }

    return this.stripe;
  }
}
