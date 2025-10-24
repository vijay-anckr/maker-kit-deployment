import type { PlopTypes } from '@turbo/gen';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export function createSetupGenerator(plop: PlopTypes.NodePlopAPI) {
  plop.setGenerator('setup', {
    description: 'Setup your Makerkit project',
    prompts: [
      {
        type: 'input',
        name: 'username',
        message:
          'What is your GitHub username? Please make sure you enter the same username you used to activate your Makerkit license.',
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'What is the name of the project?',
      },
      {
        type: 'confirm',
        name: 'setupHealthCheck',
        message: 'Do you want to setup a pre-commit hook for health checks?',
        default: false,
      },
    ],
    actions: [
      () => {
        execSync(`pnpm run --filter scripts requirements`);

        return 'Requirements checked';
      },
      async (answers: any) => {
        execSync(`git config user.username "${answers.username}"`, {
          stdio: 'inherit',
        });

        return 'Git user name set';
      },
      {
        type: 'modify',
        path: 'package.json',
        async transform(content, answers) {
          const pkg = JSON.parse(content);

          // Update project name in package.json
          pkg.name = answers.projectName;

          return JSON.stringify(pkg, null, 2);
        },
      },
      async (answers: any) => {
        try {
          createMakerkitConfig({
            projectName: answers.projectName,
            username: answers.username,
          });

          setupRemote();
          setupPreCommit({ setupHealthCheck: answers.setupHealthCheck });

          return 'Project setup complete. Start developing your project!';
        } catch (error) {
          console.error('Project setup failed. Aborting package generation.');
          process.exit(1);
        }
      },
    ],
  });
}

function createMakerkitConfig(params: {
  projectName: string;
  username: string;
}) {
  const config = `{
  "projectName": "${params.projectName}",
  "username": "${params.username}"
}`

  writeFileSync('.makerkitrc', config, {
    encoding: 'utf-8',
  });

  execSync('git add .makerkitrc');
}

function setupPreCommit(params: { setupHealthCheck: boolean }) {
  try {
    const filePath = '.git/hooks/pre-commit';

    const healthCheckCommands = params.setupHealthCheck
      ? `pnpm run lint:fix\npnpm run typecheck\n`.trim()
      : ``;

    const licenseCommand = `pnpm run --filter scripts license`;
    const fileContent = `#!/bin/bash\n${healthCheckCommands}\n${licenseCommand}`;

    // write file
    execSync(`echo "${fileContent}" > ${filePath}`, {
      stdio: 'inherit',
    });

    // make file executable
    execSync(`chmod +x ${filePath}`, {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Pre-commit hook setup failed. Aborting package generation.');
    process.exit(1);
  }
}

function setupRemote() {
  try {
    // Setup remote upstream
    const currentRemote = execSync('git remote get-url origin').toString();

    console.log(`Setting upstream remote to ${currentRemote} ...`);

    if (currentRemote && currentRemote.includes('github.com')) {
      execSync(`git remote remove origin`, {
        stdio: 'inherit',
      });

      execSync(`git remote add upstream ${currentRemote}`, {
        stdio: 'inherit',
      });
    } else {
      console.error('Your current remote is not GitHub');
    }
  } catch (error) {
    console.error(error);

    console.info('No current remote found. Skipping upstream remote setup.');
  }

  // Run license script
  try {
    execSync('pnpm run --filter scripts license', {
      stdio: 'inherit',
    });
  } catch (error) {
    console.error(
      `License check failed. Aborting package generation. Error: ${error}`,
    );

    process.exit(1);
  }
}
