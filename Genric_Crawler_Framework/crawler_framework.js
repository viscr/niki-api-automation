const readline = require('readline');
const gcpCrawler = require('./gcp_api_crawler');
const awsCrawler = require('./aws_api_crawler');
const jiraCrawler = require('./jira_api_crawler');
const slackCrawler = require('./slack_api_crawler');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function runCrawler(crawlerType) {
  switch (crawlerType) {
    case 'gcp':
      const repoUrl = await promptUser('Enter the Google Cloud GitHub repository URL: ');
      const targetDirectory = await promptUser('Enter the target directory: ');
      await gcpCrawler(repoUrl, targetDirectory);
      break;

    case 'aws':
      const awsWebpage = await promptUser('Enter the AWS documentation URL: ');
      await awsCrawler(awsWebpage);
      break;

    case 'jira':
      const openApiUrl = await promptUser('Enter the Jira API URL: ');
      await jiraCrawler(openApiUrl);
      break;

    case 'slack':
      const apiListFile = await promptUser('Enter the API list file: ');
      await slackCrawler(apiListFile);
      break;

    default:
      console.log('Invalid crawler type.');
  }
  rl.close();
}

async function promptUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

console.log('Choose a crawler to run:');
console.log('1. Google Cloud (gcp)');
console.log('2. AWS (aws)');
console.log('3. Jira (jira)');
console.log('4. Slack (slack)');

rl.question('Enter the number or code of the crawler you want to run: ', (choice) => {
  switch (choice) {
    case '1':
    case 'gcp':
      runCrawler('gcp');
      break;
    case '2':
    case 'aws':
      runCrawler('aws');
      break;
    case '3':
    case 'jira':
      runCrawler('jira');
      break;
    case '4':
    case 'slack':
      runCrawler('slack');
      break;
    default:
      console.log('Invalid choice.');
      rl.close();
  }
});
