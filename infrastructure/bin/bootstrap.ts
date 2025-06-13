import * as readline from 'node:readline';
import { exec } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter your AWS account number: ', (accountNumber) => {
  rl.question('Enter your AWS region: ', (region) => {
    console.log(
      `Bootstrapping AWS CDK in account ${accountNumber} and region ${region}...this may take a few minutes.`,
    );
    exec(
      `cdk bootstrap aws://${accountNumber}/${region} --app "npx ts-node infrastructure/bin/infrastructure.ts"`,
      (err, stdout, stderr) => {
        if (err) {
          console.error(`Error executing command: ${err}`);
          return;
        }

        // the *entire* stdout and stderr (buffered)
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
      },
    );
    rl.close();
  });
});
