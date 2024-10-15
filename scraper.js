const puppeteer = require('puppeteer');
const fs = require('fs');

const scrapeGoogleMapsData = async (searchQuery) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to Google Maps
    await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`, {
        waitUntil: 'networkidle2',
    });

    const resultsContainerSelector = '.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd';
    await page.waitForSelector(resultsContainerSelector, { timeout: 10000 });

    const businessUrls = new Set();
    // const scrollAndCollect = async () => {
    //     let prevHeight = -1;
    //     const maxScrolls = 100;
    //     let scrollCount = 0;
    //     const resultsContainer = await page.$(resultsContainerSelector);
        
    //     while (scrollCount < maxScrolls) {
    //         // Scroll to the bottom of the page
    //         await resultsContainer.evaluate(container => {
    //             container.scrollTo(0, container.scrollHeight);
    //         });

    //         const newUrls = await page.evaluate(() => {
    //             return Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"]')).map(anchor => anchor.href);
    //         });

    //         // Add new URLs to the set
    //         newUrls.forEach(url => businessUrls.add(url));
    //         console.log(`Collected ${newUrls.length} new URLs, total: ${businessUrls.size}`);

    //         if (newUrls.length === 0) {
    //             break;
    //         }
    //         prevHeight = await resultsContainer.evaluate(container => container.scrollHeight);
    //         scrollCount += 1;
    //     }
    // };
    const scrollAndCollect = async () => {
        let prevHeight = -1;
        const maxScrolls = 100; // You can adjust this based on your needs
        let scrollCount = 0;
        while (scrollCount < maxScrolls) {
            scrollCount += 1;
            await page.evaluate(() => {
                document.querySelector(".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd").scrollTo(0, document.querySelector(".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd").scrollHeight);
            });

            await new Promise(resolve => setTimeout(resolve, 30000));

            const newHeight = await page.evaluate('document.querySelector(".m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde.ecceSd").scrollHeight');
            if (newHeight === prevHeight) {
                break;
            }
            prevHeight = newHeight;

            const newUrls = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"]')).map(anchor => anchor.href);
            });

            newUrls.forEach(url => businessUrls.add(url));
            console.log(`Collected ${newUrls.length} new URLs, total: ${businessUrls.size}`);
        }
    };

    await scrollAndCollect();

    const data = [];

    for (const businessUrl of businessUrls) {
        const businessData = await scrapeBusinessData(page, businessUrl);
        data.push(businessData);
        console.log('Scraped Business Data:', businessData);
    }

    // Save data to CSV
    saveToCSV(data, 'scraped_data.csv');

    await browser.close();
};

const scrapeBusinessData = async (page, businessUrl) => {
    try {
        console.log(`Fetching data from: ${businessUrl}`);
        await page.goto(businessUrl, { waitUntil: 'networkidle2' });

        // Adjust these selectors based on the actual structure of the Google Maps business page
        const nameElement = await page.$('h1.DUwDvf.lfPIob');
        const name = nameElement ? await page.evaluate(el => el.innerText.trim() || 'N/A', nameElement) : 'N/A';

        const reviewsElement = await page.evaluateHandle(() => {
            const xpath = '//span[contains(@aria-label, "reviews")]';
            return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        });
        const numberOfReviews = reviewsElement ? await page.evaluate(el => {
            const match = el.innerText.match(/\(([\d,]+)\)/);
            return match ? match[1].replace(/,/g, '') : 'N/A';
        }, reviewsElement) : 'N/A';

        const ratingsElement = await page.$('.ceNzKf[role="img"]'); // Select the element with the aria-label
        const ratings = ratingsElement ? await page.evaluate(el => el.getAttribute('aria-label').split(' ')[0], ratingsElement) : 'N/A';

        const addressElement = await page.$('.Io6YTe.fontBodyMedium.kR99db.fdkmkc');
        const address = addressElement ? await page.evaluate(el => el.innerText.trim() || 'N/A', addressElement) : 'N/A';

        // Search for phone number and website in the document body or specific sections
        const bodyHandle = await page.$('body');
        const bodyHTML = await page.evaluate(el => el.innerHTML, bodyHandle);

        const phoneRegex = /(\+?\d{1,2}\s*[-.\s]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g; 
        const phoneMatch = bodyHTML.match(phoneRegex);
        let phone = 'N/A';
        if (phoneMatch) {
            phone = phoneMatch.find(num => num.match(/^\+?\d{1,2}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/)) || 'N/A';
        }

        const websiteElements = await page.$$('.rogA2c .Io6YTe'); 
        // Find the first valid website URL
        let website = 'N/A';
        const websites = [];
        for (const element of websiteElements) {
            const websiteText = await page.evaluate(el => el.innerText, element);
            if (websiteText && websiteText.includes('.')) { // Check for a valid URL structure
                websites.push(websiteText)
            }
        }
        if (websites.length > 0) {
            website = websites[0]; 
        }

        return {
            name,
            ratings,
            numberOfReviews,
            phone,
            website,
            address,
            link: businessUrl
        };
    } catch (error) {
        console.error(`Failed to scrape ${businessUrl}:`, error);
        return { name: 'N/A', ratings: 'N/A', numberOfReviews: 'N/A', phone: 'N/A', website: 'N/A', address: 'N/A', link: businessUrl };
    }
};

const saveToCSV = (data, filename) => {
    const csvHeader = "Name,Ratings,Reviews,Phone,Website,Address,Link\n";
    const csvRows = data.map(item => {
        return [
            item.name,
            item.ratings,
            item.numberOfReviews,
            item.phone,
            item.website,
            // item.address,
            `"${item.address}"`,
            item.link
        ].join(",");
    });

    const csvContent = csvHeader + csvRows.join("\n");
    fs.writeFileSync(filename, csvContent);
    console.log(`Data saved to ${filename}`);
};

// Run the scraper with your search query
const searchQuery = "restaurants in San Francisco";
scrapeGoogleMapsData(searchQuery);
