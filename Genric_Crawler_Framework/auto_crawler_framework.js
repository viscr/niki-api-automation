const gcpCrawler = require('./gcp_api_crawler'); // Replace with the correct path to gcp_crawler.js
const awsCrawler = require('./aws_api_crawler');
const jiraCrawler = require('./jira_api_crawler');
const slackCrawler = require('./slack_api_crawler');

// Define the Git repository URL and target directory
const repoUrl = 'https://github.com/googleapis/google-cloud-node.git';
const targetDirectory = 'packages';
const aws_webpage = 'https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/';
const openApiUrl = 'https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json?_v=1.6645.0-0.1294.0';
const apiListFile = 'worked-apis.txt';


async function runGcpCrawler() {
  try {
    await gcpCrawler(repoUrl, targetDirectory);
    await awsCrawler(aws_webpage);
    await jiraCrawler(openApiUrl);
    await slackCrawler(apiListFile);

  } catch (error) {
    console.error('Error running crawler:', error);
  }
}

runGcpCrawler();
