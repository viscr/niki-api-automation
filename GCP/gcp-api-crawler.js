const fs = require('fs').promises;
const path = require('path');

async function processFetchedJsonFiles(fetchedJsonDirectory) {
  try {
    const genericJson = {
      name: 'GCP',
      desc: 'Some description',
      services: [],
    };

    const jsonFiles = await findJsonFiles(fetchedJsonDirectory);

    for (const filePath of jsonFiles) {
      const jsonContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      for (const snippet of jsonData.snippets) {
        const serviceName = snippet.title.split(' ')[0]; // Use the first word of the 'title' for 'service_name'
        const isQuery = snippet.clientMethod.shortName.startsWith('Get') || snippet.clientMethod.shortName.startsWith('List');

        const serviceObject = {
          name: serviceName,
          desc: snippet.description,
          query: [],
          action: [],
          monitor: [],
        };

        const apiObject = {
          name: snippet.clientMethod.shortName, // Use 'shortName' for 'api_name'
          desc: snippet.description,
          input: snippet.clientMethod.parameters.map((parameter) => ({
            name: parameter.name,
            desc: 'Some parameter description', // You can modify this
            type: 'required', // You can modify this
            data_type: parameter.type,
          })),
          output: [],
        };

        if (isQuery) {
          serviceObject.query.push(apiObject);
        } else {
          serviceObject.action.push(apiObject);
        }

        genericJson.services.push(serviceObject);
      }
    }

    // Save the generic JSON to a file
    const outputPath = path.join(__dirname, 'generic.json');
    await fs.writeFile(outputPath, JSON.stringify(genericJson, null, 2));

    console.log('Generic JSON file generated successfully.');
  } catch (error) {
    console.error('Error processing fetched JSON files:', error);
  }
}

async function findJsonFiles(directory) {
  const files = await fs.readdir(directory);
  const jsonFiles = [];

  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStat = await fs.stat(filePath);

    if (fileStat.isFile() && path.extname(file) === '.json') {
      jsonFiles.push(filePath);
    } else if (fileStat.isDirectory()) {
      const subdirectoryJsonFiles = await findJsonFiles(filePath);
      jsonFiles.push(...subdirectoryJsonFiles);
    }
  }

  return jsonFiles;
}

const fetchedJsonDirectory = 'json-files-git'; // Replace with the actual directory path
processFetchedJsonFiles(fetchedJsonDirectory);
