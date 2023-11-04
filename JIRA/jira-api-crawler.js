const axios = require('axios');
const fs = require('fs');
// Function to fetch and parse the OpenAPI specification
async function fetchAndParseOpenAPI(url) {
  try {
    const response = await axios.get(url);
    const openApiSpec = response.data;
    const parsedData = parseOpenAPI(openApiSpec);
    return parsedData;
  } catch (error) {
    console.error('Error fetching OpenAPI specification:', error);
  }
}

// Function to parse the OpenAPI specification and create the JSON template
function parseOpenAPI(openApiSpec) {
  const services = {};

  // Extract and store service descriptions from "tags"
  const serviceTags = {};
  if (openApiSpec.tags) {
    for (const tag of openApiSpec.tags) {
      serviceTags[tag.name] = tag.description;
    }
  }

  for (const path in openApiSpec.paths) {
    const pathInfo = openApiSpec.paths[path];

    for (const method in pathInfo) {
      const methodInfo = pathInfo[method];

      const serviceName = methodInfo.tags[0];
      const operationId = methodInfo.operationId;
      const apiType = method === 'get' ? 'query' : 'action';

      if (!services[serviceName]) {
        services[serviceName] = {
          name: serviceName,
          desc: serviceTags[serviceName] || 'Service description not available',
          query: [],
          action: [],
          monitor: [],
        };
      }

      const methodDetails = {
        name: operationId,
        desc: methodInfo.summary,
        input: [],
        output: [],
      };

      if (methodInfo.parameters) {
        methodInfo.parameters.forEach((param) => {
          const paramDetails = {
            name: param.name,
            desc: param.description,
            type: param.required ? 'required' : 'optional',
            data_type: param.schema.type || 'unknown',
          };
          methodDetails.input.push(paramDetails);
        });
      }

      if (methodInfo.responses) {
        for (const statusCode in methodInfo.responses) {
          if (statusCode !== 'default') {
            const response = methodInfo.responses[statusCode];

            if (response.content && response.content['application/json']) {
              const responseSchema = response.content['application/json'].schema;

              if (responseSchema) {
                const responseDetails = {
                  name: statusCode,
                  desc: response.description,
                  data_type: responseSchema.type || 'unknown',
                };
                methodDetails.output.push(responseDetails);
              }
            }
          }
        }
      }

      services[serviceName][apiType].push(methodDetails);
    }
  }

  // Create the final JSON template
  const serviceArray = Object.values(services);

  return {
    name: 'Your App Name',
    desc: 'Your App Description',
    services: serviceArray,
  };
}

// Replace this URL with the URL of your OpenAPI specification
const openApiUrl = 'https://dac-static.atlassian.com/cloud/jira/platform/swagger-v3.v3.json?_v=1.6638.0-0.1294.0';

// Fetch and parse the OpenAPI specification
fetchAndParseOpenAPI(openApiUrl)
  .then((parsedData) => {
    const apiSpecsFile = 'app-jira3.json';
    const jsonString = JSON.stringify(parsedData, null, 2)
    console.log(JSON.stringify(parsedData, null, 2));
    fs.appendFileSync(apiSpecsFile, `${jsonString}`);
  })
  .catch((error) => {
    console.error('Error:', error);
  });