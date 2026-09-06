/**
 * script.js
 * -----------------------------------------------------------------------
 * Currency Converter logic.
 *
 * Data source: ExchangeRate-API's free, no-API-key "Open Access" endpoint
 * (https://www.exchangerate-api.com/docs/free). No private key is ever
 * used or exposed here -- the open endpoint doesn't require one.
 *
 * Currency names/countries come from currencies.js (CURRENCIES). This
 * file never hard-codes exchange rates -- those are always fetched live
 * (with localStorage caching to avoid hammering the API).
 */

// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------
const API_BASE = 'https://open.er-api.com/v6/latest/';
const CACHE_PREFIX = 'currconv_rates_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours -- matches the Open Access endpoint's update cadence
const GLOBE_FLAG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<circle cx="32" cy="32" r="30" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>' +
        '<path d="M2 32h60M32 2c8 8 8 44 0 60M32 2c-8 8-8 44 0 60M8 16h48M8 48h48" ' +
        'fill="none" stroke="#94a3b8" stroke-width="2"/>' +
        '</svg>'
    );

// ---------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------
const form = document.getElementById('converterForm');
const amountInput = document.getElementById('amount');
const amountError = document.getElementById('amountError');
const fromCurrency = document.getElementById('from');
const toCurrency = document.getElementById('to');
const fromFlag = document.getElementById('fromFlag');
const toFlag = document.getElementById('toFlag');
const convertBtn = document.getElementById('convert');
const swapBtn = document.getElementById('swapBtn');
const resultDiv = document.getElementById('result');

let isLoading = false;

// ---------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------
function populateCurrencies() {
    const codes = Object.keys(CURRENCIES).sort();
    const fromFragment = document.createDocumentFragment();
    const toFragment = document.createDocumentFragment();

    codes.forEach(code => {
        const label = `${code} - ${CURRENCIES[code].name}`;
        fromFragment.appendChild(new Option(label, code));
        toFragment.appendChild(new Option(label, code));
    });

    fromCurrency.appendChild(fromFragment);
    toCurrency.appendChild(toFragment);

    fromCurrency.value = codes.includes('USD') ? 'USD' : codes[0];
    toCurrency.value = codes.includes('INR') ? 'INR' : codes[1] || codes[0];

    updateFlags();
}

function flagUrlFor(code) {
    const meta = CURRENCIES[code];
    if (!meta || !meta.iso2) return GLOBE_FLAG;
    return `https://flagsapi.com/${meta.iso2}/flat/64.png`;
}

function updateFlags() {
    const fromMeta = CURRENCIES[fromCurrency.value];
    const toMeta = CURRENCIES[toCurrency.value];

    fromFlag.src = flagUrlFor(fromCurrency.value);
    fromFlag.alt = fromMeta ? `Flag representing ${fromMeta.country}` : 'Currency flag';
    fromFlag.onerror = () => { fromFlag.onerror = null; fromFlag.src = GLOBE_FLAG; };

    toFlag.src = flagUrlFor(toCurrency.value);
    toFlag.alt = toMeta ? `Flag representing ${toMeta.country}` : 'Currency flag';
    toFlag.onerror = () => { toFlag.onerror = null; toFlag.src = GLOBE_FLAG; };
}

// ---------------------------------------------------------------------
// Result panel helpers
// ---------------------------------------------------------------------
function showResult(html) {
    resultDiv.innerHTML = html;
    resultDiv.classList.add('visible');
}

function hideResult() {
    resultDiv.classList.remove('visible');
    resultDiv.innerHTML = '';
}

function setFieldError(message) {
    amountError.textContent = message || '';
    amountInput.classList.toggle('invalid', Boolean(message));
}

// ---------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------
function formatCurrencyAmount(value, code) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
            currencyDisplay: 'symbol',
            maximumFractionDigits: 2
        }).format(value);
    } catch (err) {
        // Intl doesn't recognise some very new/rare ISO codes in older
        // or less complete browser ICU data -- fall back gracefully.
        return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} ${code}`;
    }
}

function formatRate(rate) {
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
    }).format(rate);
}

function formatUpdatedTime(utcString) {
    if (!utcString) return '';
    const date = new Date(utcString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

// ---------------------------------------------------------------------
// Caching (localStorage) -- reduces unnecessary API calls
// ---------------------------------------------------------------------
function readCache(base) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + base);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.rates || !parsed.fetchedAt) return null;
        if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
        return parsed;
    } catch (err) {
        return null;
    }
}

function writeCache(base, payload) {
    try {
        localStorage.setItem(
            CACHE_PREFIX + base,
            JSON.stringify({ ...payload, fetchedAt: Date.now() })
        );
    } catch (err) {
        // localStorage may be unavailable (private browsing, quota) --
        // caching is an optimisation, not a requirement, so fail silently.
    }
}

// ---------------------------------------------------------------------
// API
// ---------------------------------------------------------------------
async function getRates(base) {
    const cached = readCache(base);
    if (cached) return cached;

    let response;
    try {
        response = await fetch(`${API_BASE}${encodeURIComponent(base)}`);
    } catch (err) {
        throw new Error('Network error. Please check your connection and try again.');
    }

    if (response.status === 429) {
        throw new Error('Too many requests right now. Please wait a moment and try again.');
    }
    if (response.status >= 500) {
        throw new Error('The exchange rate service is temporarily unavailable. Please try again shortly.');
    }
    if (!response.ok) {
        throw new Error('Could not fetch exchange rates. Please try again.');
    }

    let data;
    try {
        data = await response.json();
    } catch (err) {
        throw new Error('Received an invalid response from the exchange rate service.');
    }

    if (data.result !== 'success' || !data.rates) {
        throw new Error('That base currency is not supported by the exchange rate service.');
    }

    const payload = {
        rates: data.rates,
        base: data.base_code || base,
        lastUpdated: data.time_last_update_utc || null
    };

    writeCache(base, payload);
    return payload;
}

// ---------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------
function readValidAmount() {
    const raw = amountInput.value.trim();

    if (raw === '') {
        setFieldError('Please enter an amount.');
        return null;
    }

    const amount = Number(raw);

    if (!Number.isFinite(amount)) {
        setFieldError('Please enter a valid number.');
        return null;
    }

    if (amount <= 0) {
        setFieldError('Amount must be greater than zero.');
        return null;
    }

    setFieldError('');
    return amount;
}

// ---------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------
function setLoading(loading) {
    isLoading = loading;
    convertBtn.disabled = loading;
    convertBtn.classList.toggle('loading', loading);
    swapBtn.disabled = loading;
}

// ---------------------------------------------------------------------
// Core conversion
// ---------------------------------------------------------------------
async function convertCurrency() {
    if (isLoading) return;

    const amount = readValidAmount();
    if (amount === null) {
        hideResult();
        return;
    }

    const from = fromCurrency.value;
    const to = toCurrency.value;

    if (!CURRENCIES[from] || !CURRENCIES[to]) {
        showResult('<p class="result-error">Please choose valid currencies.</p>');
        return;
    }

    // Same-currency conversion never needs an API call.
    if (from === to) {
        const line1 = `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)} ${from} = ${formatCurrencyAmount(amount, to)}`;
        showResult(`
            <p class="result-main">${line1}</p>
            <p class="result-rate">1 ${from} = 1 ${to}</p>
        `);
        return;
    }

    setLoading(true);
    showResult('<p class="result-rate">Converting…</p>');

    try {
        const { rates, lastUpdated } = await getRates(from);

        if (!(to in rates)) {
            throw new Error(`${to} is not currently supported for conversion from ${from}.`);
        }

        const rate = rates[to];
        const converted = amount * rate;

        const line1 = `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)} ${from} = ${formatCurrencyAmount(converted, to)}`;
        const line2 = `1 ${from} = ${formatRate(rate)} ${to}`;
        const updated = formatUpdatedTime(lastUpdated);

        showResult(`
            <p class="result-main">${line1}</p>
            <p class="result-rate">${line2}</p>
            ${updated ? `<p class="result-updated">Rates last updated: ${updated}</p>` : ''}
        `);
    } catch (error) {
        showResult(`<p class="result-error">${error.message || 'Conversion failed. Please try again.'}</p>`);
    } finally {
        setLoading(false);
    }
}

// ---------------------------------------------------------------------
// Swap
// ---------------------------------------------------------------------
function swapCurrencies() {
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    updateFlags();

    // If a result is already showing, refresh it for the new pair.
    if (resultDiv.classList.contains('visible') && amountInput.value.trim() !== '') {
        convertCurrency();
    }
}

// ---------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------
form.addEventListener('submit', (event) => {
    event.preventDefault(); // Enter key in the amount field submits the form -- handle it here.
    convertCurrency();
});

swapBtn.addEventListener('click', swapCurrencies);
fromCurrency.addEventListener('change', updateFlags);
toCurrency.addEventListener('change', updateFlags);

amountInput.addEventListener('input', () => {
    if (amountError.textContent) setFieldError('');
});

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    populateCurrencies();
    hideResult();
});
