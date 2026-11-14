/**
 * script.js
 * -----------------------------------------------------------------------
 * Currency Converter Engine & UI Logic.
 *
 * Data source: ExchangeRate-API's free, no-API-key "Open Access" endpoint
 * (https://www.exchangerate-api.com/docs/free).
 *
 * Currency names/countries come from currencies.js (CURRENCIES).
 * Rates are fetched live and cached in localStorage for 24 hours.
 */

// ---------------------------------------------------------------------
// Config & Constants
// ---------------------------------------------------------------------
const API_BASE = 'https://open.er-api.com/v6/latest/';
const CACHE_PREFIX = 'currconv_rates_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
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
const amountPrefix = document.getElementById('amountPrefix');
const fromCurrency = document.getElementById('from');
const toCurrency = document.getElementById('to');
const fromFlag = document.getElementById('fromFlag');
const toFlag = document.getElementById('toFlag');
const convertBtn = document.getElementById('convert');
const swapBtn = document.getElementById('swapBtn');
const resultDiv = document.getElementById('result');
const exchangeCard = document.getElementById('exchangeCard');

let isLoading = false;

// ---------------------------------------------------------------------
// Currency Symbol Helper
// ---------------------------------------------------------------------
function getCurrencySymbol(code) {
    try {
        const formatter = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: code,
            currencyDisplay: 'narrowSymbol'
        });
        const parts = formatter.formatToParts(1);
        const currencyPart = parts.find(p => p.type === 'currency');
        return currencyPart ? currencyPart.value : code;
    } catch (e) {
        return code;
    }
}

// ---------------------------------------------------------------------
// Setup & Population
// ---------------------------------------------------------------------
function populateCurrencies() {
    if (typeof CURRENCIES === 'undefined') {
        console.error('CURRENCIES database not loaded.');
        return;
    }

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
    if (typeof CURRENCIES === 'undefined') return GLOBE_FLAG;
    const meta = CURRENCIES[code];
    if (!meta || !meta.iso2) return GLOBE_FLAG;
    return `https://flagsapi.com/${meta.iso2}/flat/64.png`;
}

function updateFlags() {
    const fromVal = fromCurrency.value;
    const toVal = toCurrency.value;
    const fromMeta = typeof CURRENCIES !== 'undefined' ? CURRENCIES[fromVal] : null;
    const toMeta = typeof CURRENCIES !== 'undefined' ? CURRENCIES[toVal] : null;

    fromFlag.src = flagUrlFor(fromVal);
    fromFlag.alt = fromMeta ? `Flag representing ${fromMeta.country}` : 'Currency flag';
    fromFlag.onerror = () => { fromFlag.onerror = null; fromFlag.src = GLOBE_FLAG; };

    toFlag.src = flagUrlFor(toVal);
    toFlag.alt = toMeta ? `Flag representing ${toMeta.country}` : 'Currency flag';
    toFlag.onerror = () => { toFlag.onerror = null; toFlag.src = GLOBE_FLAG; };

    // Update input currency prefix symbol
    if (amountPrefix) {
        amountPrefix.textContent = getCurrencySymbol(fromVal);
    }
}

// ---------------------------------------------------------------------
// Result Panel Helpers
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

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ---------------------------------------------------------------------
// Formatting Helpers
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
// Caching (localStorage)
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
        // Caching is non-critical fallback
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
        throw new Error('Network error. Please check your internet connection and try again.');
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
        setFieldError('Please enter a valid numeric value.');
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

    if (typeof CURRENCIES !== 'undefined' && (!CURRENCIES[from] || !CURRENCIES[to])) {
        showResult(`
            <div class="result-error-box">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <div>
                    <div class="result-error-title">Invalid Selection</div>
                    <div class="result-error-desc">Please choose supported currencies from the dropdown menus.</div>
                </div>
            </div>
        `);
        return;
    }

    const formattedAmount = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount);

    // Same-currency conversion
    if (from === to) {
        const formattedConverted = formatCurrencyAmount(amount, to);
        showResult(`
            <div class="result-top-bar">
                <span class="result-tag">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Converted Amount
                </span>
                <span class="result-tag-live">Same Currency</span>
            </div>
            <div class="result-main-value">${formattedConverted}</div>
            <div class="result-source-value">${formattedAmount} ${from} =</div>
            <div class="result-rates-grid">
                <div class="rate-item">
                    <span class="rate-item-label">Exchange Rate</span>
                    <span class="rate-item-val">1 ${from} = 1 ${to}</span>
                </div>
                <div class="rate-item">
                    <span class="rate-item-label">Inverse Rate</span>
                    <span class="rate-item-val">1 ${to} = 1 ${from}</span>
                </div>
            </div>
            <p class="result-disclaimer">Identical source and target currency selected.</p>
        `);
        return;
    }

    setLoading(true);
    showResult(`
        <div class="result-loading-box">
            <span class="result-inline-spinner" aria-hidden="true"></span>
            <span>Fetching real-time exchange rates…</span>
        </div>
    `);

    try {
        const { rates, lastUpdated } = await getRates(from);

        if (!(to in rates)) {
            throw new Error(`${to} is not currently supported for conversion from ${from}.`);
        }

        const rate = rates[to];
        const converted = amount * rate;
        const formattedConverted = formatCurrencyAmount(converted, to);
        const rateFormatted = formatRate(rate);
        const inverseRate = formatRate(1 / rate);
        const updated = formatUpdatedTime(lastUpdated);

        showResult(`
            <div class="result-top-bar">
                <span class="result-tag">
                    <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Converted Amount
                </span>
                <span class="result-tag-live">Live Mid-Market</span>
            </div>
            <div class="result-main-value">${formattedConverted}</div>
            <div class="result-source-value">${formattedAmount} ${from} =</div>
            <div class="result-rates-grid">
                <div class="rate-item">
                    <span class="rate-item-label">Exchange Rate</span>
                    <span class="rate-item-val">1 ${from} = ${rateFormatted} ${to}</span>
                </div>
                <div class="rate-item">
                    <span class="rate-item-label">Inverse Rate</span>
                    <span class="rate-item-val">1 ${to} = ${inverseRate} ${from}</span>
                </div>
            </div>
            ${updated ? `<p class="result-timestamp"><i class="fa-regular fa-clock" aria-hidden="true"></i> Rates last updated: ${updated}</p>` : ''}
        `);
    } catch (error) {
        showResult(`
            <div class="result-error-box">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <div>
                    <div class="result-error-title">Conversion Error</div>
                    <div class="result-error-desc">${escapeHtml(error.message || 'Conversion failed. Please try again.')}</div>
                </div>
            </div>
        `);
    } finally {
        setLoading(false);
    }
}

// ---------------------------------------------------------------------
// Swap Currencies
// ---------------------------------------------------------------------
function swapCurrencies() {
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    updateFlags();

    if (amountInput.value.trim() !== '') {
        convertCurrency();
    }
}

// ---------------------------------------------------------------------
// Quick Amount Preset Chips (1, 10, 100, 500, 1000, 5000)
// ---------------------------------------------------------------------
function setupPresets() {
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-preset');
            if (!val) return;
            amountInput.value = val;
            setFieldError('');
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            convertCurrency();
        });
    });

    amountInput.addEventListener('input', () => {
        const currentVal = amountInput.value.trim();
        presetBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-preset') === currentVal);
        });
    });
}

// ---------------------------------------------------------------------
// Popular Currency Pairs
// ---------------------------------------------------------------------
async function loadPopularRates() {
    const bases = ['USD', 'EUR', 'GBP'];
    const rateMaps = {};

    for (const base of bases) {
        try {
            const data = await getRates(base);
            rateMaps[base] = data.rates;
        } catch (e) {
            console.warn(`Could not load rates for base ${base}:`, e);
        }
    }

    const rateElements = document.querySelectorAll('[data-rate-from][data-rate-to]');
    rateElements.forEach(el => {
        const from = el.getAttribute('data-rate-from');
        const to = el.getAttribute('data-rate-to');
        if (rateMaps[from] && rateMaps[from][to]) {
            const r = rateMaps[from][to];
            el.textContent = `1 ${from} = ${formatRate(r)} ${to}`;
        }
    });
}

function setupPopularPairs() {
    const pairCards = document.querySelectorAll('.pair-card');
    pairCards.forEach(card => {
        const handleSelect = () => {
            const from = card.getAttribute('data-from');
            const to = card.getAttribute('data-to');
            if (!from || !to) return;

            fromCurrency.value = from;
            toCurrency.value = to;
            updateFlags();

            if (!amountInput.value || Number(amountInput.value) <= 0) {
                amountInput.value = '1';
            }

            // Sync preset active state
            const presetBtns = document.querySelectorAll('.preset-btn');
            presetBtns.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-preset') === amountInput.value.trim());
            });

            // Highlight animation on converter card
            if (exchangeCard) {
                exchangeCard.classList.remove('card-highlight');
                void exchangeCard.offsetWidth; // trigger reflow
                exchangeCard.classList.add('card-highlight');
                setTimeout(() => exchangeCard.classList.remove('card-highlight'), 1200);
            }

            // Smooth scroll to converter
            const converterSection = document.getElementById('converter');
            if (converterSection) {
                converterSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            convertCurrency();
        };

        card.addEventListener('click', handleSelect);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect();
            }
        });
    });
}

// ---------------------------------------------------------------------
// Mobile Navigation Drawer
// ---------------------------------------------------------------------
function setupMobileNav() {
    const toggleBtn = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    if (!toggleBtn || !navMenu) return;

    const toggleNav = (open) => {
        const isOpen = typeof open === 'boolean' ? open : !navMenu.classList.contains('nav-open');
        navMenu.classList.toggle('nav-open', isOpen);
        toggleBtn.classList.toggle('active', isOpen);
        toggleBtn.setAttribute('aria-expanded', String(isOpen));
        document.body.classList.toggle('nav-lock', isOpen);
    };

    toggleBtn.addEventListener('click', () => toggleNav());

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => toggleNav(false));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('nav-open')) {
            toggleNav(false);
        }
    });

    document.addEventListener('click', (e) => {
        if (navMenu.classList.contains('nav-open') &&
            !navMenu.contains(e.target) &&
            !toggleBtn.contains(e.target)) {
            toggleNav(false);
        }
    });
}

// ---------------------------------------------------------------------
// ScrollSpy Navigation Active Highlight
// ---------------------------------------------------------------------
function setupScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const onScroll = () => {
        const scrollY = window.pageYOffset + 120;
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 120;
            const sectionId = current.getAttribute('id');

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
                });
            }
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
}

// ---------------------------------------------------------------------
// Event Listeners
// ---------------------------------------------------------------------
form.addEventListener('submit', (event) => {
    event.preventDefault();
    convertCurrency();
});

swapBtn.addEventListener('click', swapCurrencies);
fromCurrency.addEventListener('change', updateFlags);
toCurrency.addEventListener('change', updateFlags);

amountInput.addEventListener('input', () => {
    if (amountError.textContent) setFieldError('');
});

// ---------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    populateCurrencies();
    setupPresets();
    setupPopularPairs();
    setupMobileNav();
    setupScrollSpy();

    // Perform initial conversion to show live mid-market data immediately
    convertCurrency();

    // Fetch rates for popular pairs in the background
    loadPopularRates();
});
