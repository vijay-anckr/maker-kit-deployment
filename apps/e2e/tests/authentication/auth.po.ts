import { createClient } from '@supabase/supabase-js';

import test, { Page, expect } from '@playwright/test';

import { AUTH_STATES } from '../utils/auth-state';
import { Mailbox } from '../utils/mailbox';

const MFA_KEY = 'NHOHJVGPO3R3LKVPRMNIYLCDMBHUM2SE';

export class AuthPageObject {
  private readonly page: Page;
  private readonly mailbox: Mailbox;

  static MFA_KEY = MFA_KEY;

  constructor(page: Page) {
    this.page = page;
    this.mailbox = new Mailbox(page);
  }

  static setupSession(user: (typeof AUTH_STATES)[keyof typeof AUTH_STATES]) {
    test.use({ storageState: user });
  }

  goToSignIn(next?: string) {
    return this.page.goto(`/auth/sign-in${next ? `?next=${next}` : ''}`);
  }

  goToSignUp(next?: string) {
    return this.page.goto(`/auth/sign-up${next ? `?next=${next}` : ''}`);
  }

  async signOut() {
    await this.page.click('[data-test="account-dropdown-trigger"]');
    await this.page.click('[data-test="account-dropdown-sign-out"]');
  }

  async signIn(params: { email: string; password: string }) {
    await this.page.waitForTimeout(100);

    await this.page.fill('input[name="email"]', params.email);
    await this.page.fill('input[name="password"]', params.password);
    await this.page.click('button[type="submit"]');
  }

  async signUp(params: {
    email: string;
    password: string;
    repeatPassword: string;
  }) {
    await this.page.waitForTimeout(100);

    await this.page.fill('input[name="email"]', params.email);
    await this.page.fill('input[name="password"]', params.password);
    await this.page.fill('input[name="repeatPassword"]', params.repeatPassword);

    await this.page.click('button[type="submit"]');
  }

  async submitMFAVerification(key: string) {
    const period = 30;

    const { TOTP } = await import('totp-generator');

    const { otp } = await TOTP.generate(key, {
      period,
    });

    console.log(`OTP ${otp} code`, {
      period,
    });

    await this.page.fill('[data-input-otp]', otp);
    await this.page.click('[data-test="submit-mfa-button"]');
  }

  async visitConfirmEmailLink(
    email: string,
    params: {
      deleteAfter: boolean;
      subject?: string;
    } = {
      deleteAfter: true,
    },
  ) {
    return expect(async () => {
      const res = await this.mailbox.visitMailbox(email, params);

      expect(res).not.toBeNull();
    }).toPass();
  }

  createRandomEmail() {
    const value = Math.random() * 10000000000000;

    return `${value.toFixed(0)}@makerkit.dev`;
  }

  async signUpFlow(path: string) {
    const email = this.createRandomEmail();

    await this.page.goto(`/auth/sign-up?next=${path}`);

    await this.signUp({
      email,
      password: 'password',
      repeatPassword: 'password',
    });

    await this.visitConfirmEmailLink(email);

    return {
      email,
    };
  }

  async updatePassword(password: string) {
    await this.page.fill('[name="password"]', password);
    await this.page.fill('[name="repeatPassword"]', password);
    await this.page.click('[type="submit"]');
  }

  async loginAsSuperAdmin(params: { next?: string }) {
    await this.loginAsUser({
      email: 'super-admin@makerkit.dev',
      next: '/auth/verify',
    });

    // Complete MFA verification
    await this.submitMFAVerification(MFA_KEY);
    await this.page.waitForURL(params.next ?? '/home');
  }

  async bootstrapUser({
    email,
    password,
    name,
  }: {
    email: string;
    password?: string;
    name: string;
  }) {
    const client = createClient(
      'http://127.0.0.1:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    );

    const { data, error } = await client.auth.admin.createUser({
      email,
      password: password || 'testingpassword',
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async loginAsUser(params: {
    email: string;
    password?: string;
    next?: string;
  }) {
    await this.goToSignIn(params.next);

    await this.signIn({
      email: params.email,
      password: params.password || 'testingpassword',
    });

    await this.page.waitForURL(params.next ?? '**/home');
  }
}
