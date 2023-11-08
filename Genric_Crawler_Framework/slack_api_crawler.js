const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

function apiCrawler($, apiName) {
  try {
    const apiDict = {};
    const input = [];
    apiDict.name = apiName;

    const elements = $('.apiReference__mainDescription');
    elements.each(function () {
      apiDict.desc = $(this).text();
    });

    const ArgumentsSection = $('.apiMethodPage__argumentList');

    // const argDict = {};

    ArgumentsSection.find('.apiMethodPage__argumentRow').each((index, element) => {
        const argumentName = $(element).find('.apiMethodPage__argument').text().trim();
        const argumentType = $(element).find('.apiMethodPage__argumentType').text().trim();
        const isOptional = $(element).find('.apiMethodPage__argumentOptionality--optional').length > 0;
        const argumentDescription = $(element).find('.apiMethodPage__argumentDesc p').text().trim();
        const argumentExample = $(element).find('.apiReference__exampleCode code').text().trim();
        const required = !isOptional; 

        input.push({
            name: argumentName,
            type: argumentType,
            description: argumentDescription,
            required: required,
            example: argumentExample,
        });
      });

    // console.log(argDict)

    apiDict.input = input;

    const output = [];
    const targetDiv = $('.apiDocsToggler__target.apiDocsToggler__target--toggled.apiReference__response');
    const commonSuccessfulResponse = targetDiv.find('h3:contains("Common successful response")').next('p').text() || 'Successful response description not found.';
    const successCodeElement = targetDiv.find('pre').find('code');

    const successJson = successCodeElement ? successCodeElement.text() : 'Code element not found';
    output.push(successJson);

    apiDict.output = output;

    return apiDict;
  } catch (e) {
    console.log(`Error in apiCrawler: ${e}`);
    return null;
  }
}

async function slackCrawler(apiListFile) {
    const apiNames = fs.readFileSync(apiListFile, 'utf-8').split('\n');
    const app = {
      name: "Slack", // Replace with the actual app name
      desc: "Slack is a cloud-based freemium cross-platform instant messaging service created by Slack Technologies and currently owned by Salesforce.",
      services: [],
    };
  
    try {
      for (const apiName of apiNames) {
        console.log(apiName)
        const serviceName = apiName.split('.')[0];
        const serviceDesc = ""; // You can populate this with a description if available.
        const service = {
          name: serviceName,
          desc: serviceDesc,
          query: [],
          action: [],
          monitor: [],
        };
  
        const url = `https://api.slack.com/methods/${apiName}`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const method_type = $('.apiMethodPage__method');
        let method = ""; // Initialize method variable.
  
        method_type.each(function () {
          method = $(this).text().trim();
        });
  
        const apiEndpoint = apiCrawler($, apiName);
  
        if (method === "GET") {
          service.query.push(apiEndpoint);
        } else {
          service.action.push(apiEndpoint);
        }
  
        // Push the service object into the app's services array.
        app.services.push(service);
      }
    } catch (e) {
      console.log(`Error in making requests: ${e}`);
    }
  
    try {
      const apiSpecsFile = 'slack-app.json';
      const jsonString = JSON.stringify(app, null, 2);
      fs.writeFileSync(apiSpecsFile, jsonString);
    } catch (e) {
      console.log(`Error writing to 'slack-app.json': ${e}`);
    }
}

module.exports = slackCrawler;
