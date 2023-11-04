const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const execPromise = promisify(exec);
const errorLogFilePath = 'error_occurred.txt';

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
      console.log(`Last JSON file in ${directory}: ${lastJsonFile}`);
      // Implement your logic to process the last JSON file here
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

async function logError(errorMessage) {
  const timestamp = new Date().toLocaleString();
  const logMessage = `${timestamp}: ${errorMessage}\n`;

  try {
    await fs.appendFile(errorLogFilePath, logMessage);
  } catch (error) {
    console.error(`Error logging error message: ${error}`);
  }
}

const repoUrl = 'https://github.com/googleapis/google-cloud-node.git';
const targetDirectory = 'packages';
cloneRepoAndFetchLastJsonFiles(repoUrl, targetDirectory);
