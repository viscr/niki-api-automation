const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const execPromise = promisify(exec);
const errorLogFilePath = 'error_occurred.txt';
const localOutputDirectory = 'json-files-git';

async function cloneRepoAndFetchLastJsonFiles(repoUrl, targetDirectory) {
  const tempDir = path.join(__dirname, 'temp-repo');

  try {
    await execPromise(`git clone ${repoUrl} ${tempDir}`);
    const packagesDir = path.join(tempDir, targetDirectory);
    await traverseDirectory(packagesDir);
  } catch (error) {
    logError(`Error cloning repository: ${error}`);
  } finally {
    try {
      await execPromise(`rm -rf ${tempDir}`);
    } catch (cleanupError) {
      logError(`Error cleaning up temporary directory: ${cleanupError}`);
    }
  }
}

async function traverseDirectory(directory) {
  try {
    const files = await fs.readdir(directory);

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory() && file.startsWith('google-cloud')) {
        await processGoogleCloudDirectory(filePath);
      }
    }
  } catch (error) {
    logError(`Error reading directory: ${error}`);
  }
}

async function processGoogleCloudDirectory(directory) {
  try {
    const lastJsonFile = await findLastJsonFileInDeepestDirectory(
      path.join(directory, 'samples', 'generated')
    );

    if (lastJsonFile) {
      const outputDirectory = path.join(localOutputDirectory, path.basename(directory));
      await saveLastJsonFile(lastJsonFile, outputDirectory);
    }
  } catch (error) {
    logError(`Error processing directory: ${error}`);
  }
}

async function findLastJsonFileInDeepestDirectory(directory) {
  try {
    const subdirs = await fs.readdir(directory);
    let lastJsonFile = null;

    for (const subdir of subdirs) {
      const subdirPath = path.join(directory, subdir);
      const stat = await fs.stat(subdirPath);

      if (stat.isDirectory()) {
        const jsonFile = await findLastJsonFileInDeepestDirectory(subdirPath);
        if (jsonFile && (!lastJsonFile || jsonFile.stat.mtime > lastJsonFile.stat.mtime)) {
          lastJsonFile = jsonFile;
        }
      } else if (path.extname(subdir) === '.json') {
        const filePath = path.join(directory, subdir);
        const stat = await fs.stat(filePath);

        if (!lastJsonFile || stat.mtime > lastJsonFile.stat.mtime) {
          lastJsonFile = { filePath, stat };
        }
      }
    }

    return lastJsonFile;
  } catch (error) {
    logError(`Error finding JSON file: ${error}`);
    return null;
  }
}

async function saveLastJsonFile(lastJsonFile, outputDirectory) {
  try {
    await fs.mkdir(outputDirectory, { recursive: true });
    const destinationPath = path.join(outputDirectory, path.basename(lastJsonFile.filePath));
    await fs.copyFile(lastJsonFile.filePath, destinationPath);
  } catch (error) {
    logError(`Error saving JSON file: ${error}`);
  }
}

async function logError(errorMessage) {
  const timestamp = new Date().toLocaleString();
  const logMessage = `${timestamp}: ${errorMessage}\n`;

  try {
    await fs.appendFile(errorLogFilePath, logMessage);
  } catch (error) {
    console.error(`Error logging error message: ${error}`);
  }
}

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
          const serviceName = snippet.title.split(' ')[0];
          const isQuery = snippet.clientMethod.shortName.startsWith('Get') || snippet.clientMethod.shortName.startsWith('List');
  
          const serviceObject = {
            name: serviceName,
            desc: snippet.description,
            query: [],
            action: [],
            monitor: [],
          };
  
          const apiObject = {
            name: snippet.clientMethod.shortName,
            desc: snippet.description,
            input: snippet.clientMethod.parameters.map((parameter) => ({
              name: parameter.name,
              desc: 'Some parameter description',
              type: 'required',
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
  
      // Save the generic JSON to a file in the script's directory
      const outputPath = path.join(__dirname, 'gcp-app.json');
      await fs.writeFile(outputPath, JSON.stringify(genericJson, null, 2));
  
      // Delete the 'json-files-git' folder
      await fs.rm(fetchedJsonDirectory, { recursive: true });
  
      console.log('Generic JSON file generated successfully, and the "json-files-git" folder has been deleted.');
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

async function gcpCrawler(repoUrl, targetDirectory) {
  await cloneRepoAndFetchLastJsonFiles(repoUrl, targetDirectory);
  const fetchedJsonDirectory = localOutputDirectory;
  await processFetchedJsonFiles(fetchedJsonDirectory);
}


module.exports = gcpCrawler;

// // Replace these values with your Git repository URL and target directory
// const repoUrl = 'https://github.com/googleapis/google-cloud-node.git';
// const targetDirectory = 'packages';


// gcp_crawler(repoUrl, targetDirectory);

