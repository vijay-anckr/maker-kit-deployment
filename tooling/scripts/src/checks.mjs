import { readFileSync, readdirSync } from 'fs';
import * as path from 'path';

const whitelist = {
  STRIPE_SECRET_KEY: [/sk_test_*/],
  STRIPE_WEBHOOK_SECRET: [/whsec_*/],
  EMAIL_PASSWORD: ['password'],
  SUPABASE_DB_WEBHOOK_SECRET: ['WEBHOOKSECRET'],
  SUPABASE_SERVICE_ROLE_KEY: [/qQwv8Hdp7fsn3W0YpN81IU/],
};

// List of sensitive environment variables that should not be in .env files
const sensitiveEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'LEMON_SQUEEZY_SECRET_KEY',
  'LEMON_SQUEEZY_SIGNING_SECRET',
  'KEYSTATIC_GITHUB_TOKEN',
  'SUPABASE_DB_WEBHOOK_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EMAIL_PASSWORD',
  'CAPTCHA_SECRET_TOKEN',
];

// Files to check
const envFiles = ['.env', '.env.development', '.env.production'];

function checkEnvFiles(rootPath) {
  let hasSecrets = false;

  envFiles.forEach((file) => {
    try {
      const envPath = path.join(process.cwd(), rootPath, file);
      const contents = readFileSync(envPath, 'utf8');
      const lines = contents.split('\n');

      lines.forEach((line, index) => {
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) return;

        // Check if line contains any sensitive vars
        sensitiveEnvVars.forEach((secret) => {
          if (line.startsWith(`${secret}=`)) {
            // Extract the value
            const value = line.split('=')[1].trim().replace(/["']/g, '');

            // Skip if value is whitelisted
            if (isValueWhitelisted(secret, value)) {
              return;
            }

            console.error(`⚠️ Secret key "${secret}" found in ${file} on line ${index + 1}`);

            hasSecrets = true;
          }
        });
      });
    } catch (err) {
      // File doesn't exist, skip
      if (err.code === 'ENOENT') return;

      throw err;
    }
  });

  if (hasSecrets) {
    console.error('\n❌ Error: Secret keys found in environment files');

    console.error(
      '\nPlease remove sensitive information from .env files and store them securely:',
    );

    console.error('- Use environment variables in your CI/CD system');
    console.error('- For local development, use .env.local (git ignored)');
    process.exit(1);
  } else {
    const appName = rootPath.split('/').pop();

    console.log(`✅ No secret keys found in staged environment files for the app ${appName}`);
  }
}

const apps = readdirSync('../../apps');

apps.forEach(app => {
  checkEnvFiles(`../../apps/${app}`);
});

function isValueWhitelisted(key, value) {
  if (!(key in whitelist)) {
    return false;
  }

  const whiteListedValue = whitelist[key];

  if (whiteListedValue instanceof RegExp) {
    return whiteListedValue.test(value);
  }

  if (Array.isArray(whiteListedValue)) {
    return whiteListedValue.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(value);
      }

      return allowed.trim() === value.trim();
    });
  }

  return whiteListedValue.trim() === value.trim();
}