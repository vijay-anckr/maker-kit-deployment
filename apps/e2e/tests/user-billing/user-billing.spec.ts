import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../authentication/auth.po';
import { UserBillingPageObject } from './user-billing.po';

test.describe('User Billing', () => {
  test('user can subscribe to a plan', async ({ page }) => {
    const po = new UserBillingPageObject(page);
    const auth = new AuthPageObject(page);

    const email = auth.createRandomEmail();

    await auth.bootstrapUser({
      email,
      name: 'Test Billing User',
    });

    await auth.loginAsUser({
      email,
      next: '/home/billing',
    });

    await po.billing.selectPlan(0);
    await po.billing.proceedToCheckout();

    await po.billing.stripe.waitForForm();
    await po.billing.stripe.fillForm();
    await po.billing.stripe.submitForm();

    await expect(po.billing.successStatus()).toBeVisible({
      timeout: 25_000,
    });

    await po.billing.returnToBilling();

    await expect(po.billing.getStatus()).toContainText('Active');
    await expect(po.billing.manageBillingButton()).toBeVisible();
  });
});
