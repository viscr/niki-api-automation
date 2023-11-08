const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function extractWordBeforeUppercase(inputString) {
  let word = '';
  for (let i = 0; i < inputString.length; i++) {
    if (inputString[i] === inputString[i].toUpperCase() && i > 0) {
      return word;
    }
    word += inputString[i];
  }
  return word;
}

const errorLogFilePath = path.join(__dirname, 'error.log');

function logErrorToFile(error) {
  const errorTimestamp = new Date().toISOString();
  const errorMessage = `${errorTimestamp}: ${error}\n`;
  fs.appendFileSync(errorLogFilePath, errorMessage);
}

async function scrapeDataFromUrl(page, url, serviceDesc) {
  try {
    await page.goto(url);
    const command = url.split('/').slice(-1)[0];
    const method = extractWordBeforeUppercase(command);

    await page.waitForSelector('.awsui_row_wih1l_189z0_316');

    const extractedData = await page.evaluate((url, method, serviceDesc) => {
      const serviceName = url.split('/client/')[1].split('/')[0];

      const data = {
        name: "AWS",
        desc: "Amazon Web Services, Inc. is a subsidiary of Amazon that provides on-demand cloud computing platforms and APIs to individuals, companies, and governments, on a metered, pay-as-you-go basis. Clients will often use this in combination with autoscaling.",
        services: [
          {
            name: serviceName,
            desc: serviceDesc,
            query: [],
            action: [],
            monitor: [],
          },
        ],
      };

      // Function to extract data from a section
      function extractSectionData(sectionId) {
        const section = document.querySelector(`div[data-toc="${sectionId}"]`);
        if (section) {
          const rows = Array.from(section.querySelectorAll('tr[data-selection-item="item"]'));
          return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            let apiName = cells[0].textContent.trim();
            const apiDesc = cells[2].textContent.trim();
            const dataType = cells[1].textContent.trim();
            const required = apiName.includes("Required");
            if (apiName.includes("Required")) {
              apiName = apiName.replace("Required", "").trim();
            }
            return { name: apiName, desc: apiDesc, type: dataType, required: required};
          });
        }
        return [];
      }

      // Determine the category based on the method
      const category = method === "Get" || method === "List" ? "query" : "action";

      // Create an API object based on the URL
      const api = {
        name: method,
        desc: method + " operation",
        input: extractSectionData('input'),
        output: extractSectionData('output'),
      };

      // Add the API to the appropriate category
      data.services[0][category].push(api);

      return data;
    }, url, method, serviceDesc);

    return extractedData;
  } catch (error) {
    console.error('Error in scrapeDataFromUrl:', error);
    logErrorToFile(error);
    return null; // Handle the error as needed
  }
}

async function awsCrawler(startUrl) {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(startUrl);

    // Add a delay if needed
    await page.waitForTimeout(20);

    const initialHrefs = await page.evaluate(() => {
      const hrefs = [];
      const links = document.querySelectorAll('.awsui_list-item_l0dv0_bk4bt_167 a');

      for (const link of links) {
        hrefs.push(link.getAttribute('href'));
      }

      return hrefs;
    });

    // Filter URLs containing '/client/' and navigate to each of them
    const clientLinks = initialHrefs.filter(href => href.includes('/client/'));

    const allHrefs = [];

    for (const link of clientLinks) {
      const clientPage = await browser.newPage();
      await clientPage.goto(`https://docs.aws.amazon.com${link}`);

      // Add a delay if needed
      await clientPage.waitForTimeout(20);

      const additionalHrefs = await clientPage.evaluate(() => {
        const hrefs = [];
        const links = document.querySelectorAll('.awsui_row_wih1l_189z0_316 a');

        for (const link of links) {
          hrefs.push(link.getAttribute('href'));
        }

        return hrefs;
      });

      const additionalHrefs_upd = additionalHrefs.filter(item => typeof item === 'string' && item.includes("/command/"));

      for (const url of additionalHrefs_upd) {
        const selector = '.awsui_root_18wu0_7v5e8_93 .awsui_text-content_6absk_1sd1h_94 p:first-child';
        try {
          await clientPage.waitForSelector(selector);
          console.log(url);
          const serviceDesc = await clientPage.$eval(selector, (element) => element.textContent);
          const data = await scrapeDataFromUrl(clientPage, `https://docs.aws.amazon.com${url}`, serviceDesc);
          const datajson = JSON.stringify(data, null, 2);
          console.log("Data:", datajson);
          allHrefs.push(data);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          logErrorToFile(error.message);
        }
      }

      await clientPage.close();
    }

    // Output the collected data
    const apiSpecsFile = 'aws-app.json';
    const jsonString = JSON.stringify(allHrefs, null, 2);
    fs.writeFileSync(apiSpecsFile, jsonString);

    await browser.close();
  } catch (error) {
    console.error('Error in main script:', error);
    logErrorToFile(error);
  }
}

// Call the main function with the start URL
// module.exports = awsCrawler;
awsCrawler('https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/');
