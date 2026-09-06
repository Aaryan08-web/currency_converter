💱 Currency Converter

A clean, responsive and user-friendly currency converter built with
HTML, CSS and JavaScript. It uses ExchangeRate-API to retrieve
supported exchange rates and provides fast conversions with local
caching.

🌐 Live Demo

🚀 Open Currency Converter

✨ Features

🌍 Supports all currencies supported by the selected
ExchangeRate-API endpoint

💱 Convert between different currencies instantly

🔄 Swap source and target currencies

🚩 Dynamic currency flags

📊 Displays the exchange rate and converted amount

🕒 Shows the latest available rate update time

⚡ 24-hour localStorage caching to reduce unnecessary API requests

⌨️ Press Enter to convert

🔍 Input validation for invalid, zero and negative amounts

⏳ Loading state with disabled conversion button

⚠️ User-friendly API and network error handling

📱 Fully responsive design for desktop, tablet and mobile

♿ Accessible form labels, buttons and live result/error messages

🔢 Professional number formatting with Intl.NumberFormat

🔐 No API key is exposed in the frontend

🛠️ Technologies Used

HTML5 --- Page structure

CSS3 --- Styling and responsive design

JavaScript (ES6+) --- Application logic

ExchangeRate-API --- Exchange-rate data

LocalStorage API --- Client-side rate caching

Font Awesome --- Icons

📁 Project Structure

CURRENCY_CONVERTER/
│
├── index.html
├── style.css
├── script.js
├── currencies.js
├── .gitignore
└── README.md

⚙️ How It Works

Select the currency you want to convert from.

Select the target currency.

Enter an amount.

Click Convert or press Enter.

The application retrieves the latest available exchange rate.

The result and exchange rate are displayed.

Exchange-rate responses are cached locally for 24 hours to reduce
repeated API requests.

Same-currency conversions are handled locally without making an
unnecessary API request.

🔌 API

Exchange rates are provided by ExchangeRate-API using its keyless
Open Access endpoint.

The application does not contain or expose a private API key.

Exchange rates from the free Open Access endpoint are updated
periodically according to the provider's service terms; they should
not be considered tick-by-tick financial-market rates.

🚀 Run Locally

No installation or build process is required.

Option 1 --- Open directly

Open index.html in a modern web browser.

Option 2 --- Use VS Code Live Server

Open the project folder in VS Code.

Install the Live Server extension if needed.

Right-click index.html.

Select Open with Live Server.

☁️ Deployment

This project is designed for static hosting and can be deployed easily
on:

Vercel

GitHub Pages

Netlify

Vercel

Push the project to GitHub.

Import the repository into Vercel.

Select Other or no framework preset.

Leave build and install commands empty.

Deploy.

🔒 Security

This project uses a public, keyless API endpoint, so no secret
credentials are stored in the repository.

If an authenticated API is used in the future, the API key should
not be placed directly in frontend JavaScript. A backend/serverless
function should be used to protect private credentials.

📱 Browser Compatibility

Works with modern browsers that support:

ES6 JavaScript

Fetch API

LocalStorage

Intl.NumberFormat

Modern CSS

Recommended browsers:

Google Chrome

Microsoft Edge

Mozilla Firefox

Safari

🎯 Future Improvements

Possible future enhancements:

Currency search

Favorite currencies

Conversion history

Copy result button

Dark/light theme

Exchange-rate charts

Offline-first experience

More advanced rate-history features

👨‍💻 Author

Aaryan Chippa

Computer Science Engineering Student

GitHub: Aaryan08-web

⭐ If you find this project useful, consider giving the repository a
star!

