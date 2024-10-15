# Google Maps Data Scraper

This project scrapes business information from Google Maps based on a search query using Puppeteer. The extracted data includes business names, ratings, reviews, phone numbers, websites, addresses, and links to their Google Maps pages.

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Saving Data](#saving-data)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. **Clone the repository:**
    ```sh
    git clone <your-repo-url>
    cd <your-repo-directory>
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

## Usage

1. **Run the scraper:**
    ```sh
    node scraper.js
    ```

2. **Modify the search query:**
    Change the `searchQuery` variable in `scraper.js` to your desired search term. For example:
    ```javascript
    const searchQuery = "restaurants in San Francisco";
    ```

## Saving Data
The scraped data is saved into a CSV file named scraped_data.csv in the following format:
    ```
    Name,Ratings,Reviews,Phone,Website,Address,Link
    ```

## Dependencies

  **Install the dependencies:**
    ```sh
    npm install puppeteer
    ```

## Contributions
Feel free to submit issues or pull requests for improvements and bug fixes. Contributions are welcome!
