<div align="center">

# 💱 Currency Converter

### Move Money Across Currencies, Seamlessly.
**Fast • Modern • Responsive • Accurate**

A professional financial technology currency exchange application built with **HTML5, CSS3 and Vanilla JavaScript (ES6+)**, powered by real-time mid-market data from **ExchangeRate-API**.

<br>

## 🚀 [OPEN CURRENCY CONVERTER](https://currencyconverter-five-chi.vercel.app/)

<br>

[![Live Demo](https://img.shields.io/badge/🚀%20LIVE%20DEMO-Currency%20Converter-007ACC?style=for-the-badge)](https://currencyconverter-five-chi.vercel.app/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-007ACC?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

</div>

---

## 🌐 Overview

**Currency Converter** is a modern, focused currency exchange tool engineered for speed, simplicity, and accuracy. Featuring a clean, light fintech aesthetic inspired by leading financial applications (Stripe, Wise, Revolut), Currency Converter supports over 160 global currencies with live mid-market rates, dynamic country flags, 24-hour intelligent rate caching, six instant amount presets, and popular currency pair insights.

---

## ✨ Features

- 🌍 **160+ Supported Currencies**: Comprehensive coverage of ISO-4217 fiat currencies.
- ⚡ **Live Mid-Market Rates**: Direct, transparent rates from ExchangeRate-API open access.
- 🕒 **24-Hour Smart Caching**: Client-side localStorage cache minimizes unnecessary API calls and provides lightning-fast response times.
- 🔄 **One-Click Currency Swap**: Smooth 180° rotation animation with instant recalculation.
- 📊 **Prominent Converted Amount**: Clear display with direct exchange rates, inverse rates, and timestamps.
- 💡 **6 Quick Amount Presets**: Instant selection buttons for standard amounts (`1`, `10`, `100`, `500`, `1,000`, `5,000`).
- 🚩 **Dynamic Flags**: Country flag integration with resilient SVG fallback for multi-nation currencies (e.g. Euro).
- 📈 **Popular Currency Pairs**: Live rates for high-volume pairs (USD→INR, EUR→INR, GBP→INR, USD→EUR, USD→GBP, USD→JPY) with one-click conversion.
- 📱 **Fully Responsive**: Flawless experience across desktops, tablets, and mobile smartphones with a dedicated mobile drawer navigation.
- ⌨️ **Accessible**: Keyboard navigation, full `focus-visible` outlines, ARIA live regions, and `prefers-reduced-motion` compliance.
- 🛡️ **Zero Markups & No Sign-Up**: 100% free, private client-side processing without ads or hidden fees.

---

## 🎨 Design System

| Element | Color Value | Description |
|---|---|---|
| **Primary Blue** | `#007ACC` | Primary buttons, active highlights, key accents |
| **Light Blue** | `#CCE0FF` | Selected states, subtle badges, icon containers |
| **Main Background** | `#F5F9FF` | Soft light fintech background |
| **Card Background** | `#FFFFFF` | Clean white cards with subtle shadows |
| **Primary Text** | `#15324B` | Deep slate navy for high contrast |
| **Secondary Text** | `#62758A` | Subdued secondary labels |
| **Borders** | `#DCE8F5` | Crisp borders and dividers |
| **Hover Background** | `#EAF3FF` | Soft hover feedback |
| **Success / Error** | `#16865B` / `#DC4545` | Functional status indicators |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic structure, accessibility landmarks & ARIA labels |
| **CSS3** | Modern CSS custom properties, grid/flexbox layouts, animations |
| **JavaScript (ES6+)** | Dynamic currency conversion engine, caching & DOM interactions |
| **ExchangeRate-API** | Real-time global exchange rates open endpoint |
| **LocalStorage** | 24-hour rate caching |
| **Intl.NumberFormat** | Localized currency symbols and number formatting |
| **Font Awesome 6** | Fintech and interface icons |
| **Google Fonts** | Inter typography |
| **Vercel** | Cloud edge deployment |

---

## ⚙️ How It Works

```text
Enter Amount (or Pick from 6 Presets)
                ↓
Select Source & Target Currencies
                ↓
Fetch / Read Cached Mid-Market Rate
                ↓
Perform Client-Side Conversion & Calculate Inverse
                ↓
Display Formatted Result & Update Timestamps
```

---

## 📄 License & Attribution

- Rates powered by [ExchangeRate-API](https://www.exchangerate-api.com).
- Flags provided by [FlagsAPI](https://flagsapi.com) with SVG fallbacks.
- Deployed on [Vercel](https://vercel.com).
