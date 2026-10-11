
"use strict";

// Select HTML elements
const amountInput = document.getElementById("amount");
const fromSelect = document.getElementById("fromCurrency");
const toSelect = document.getElementById("toCurrency");
const result = document.getElementById("result");
const rateInfo = document.getElementById("rateInfo");
const status = document.getElementById("status");
const convertButton = document.getElementById("convertButton");
const swapButton = document.getElementById("swapButton");

// Store API data
let exchangeRates = {};
let currencies = [];
let ratesDate = "";

// Convert country code into a flag emoji
function countryFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
        return "🌐";
    }

    return [...countryCode.toUpperCase()]
        .map(char =>
            String.fromCodePoint(127397 + char.charCodeAt(0))
        )
        .join("");
}

// Load countries, currency names and flags
async function loadCurrencies() {
    try {
        const response = await fetch(
            "https://restcountries.com/v3.1/all?fields=name,cca2,currencies"
        );

        if (!response.ok) {
            throw new Error("Could not load country information.");
        }

        const countries = await response.json();
        const currencyMap = new Map();

        countries.forEach(country => {
            if (!country.currencies) return;

            Object.entries(country.currencies).forEach(
                ([code, currency]) => {
                    if (!currencyMap.has(code)) {
                        currencyMap.set(code, {
                            code,
                            name: currency.name || code,
                            flag: countryFlag(country.cca2),
                            country: country.name.common
                        });
                    }
                }
            );
        });

        currencies = [...currencyMap.values()]
            .sort((a, b) => a.code.localeCompare(b.code));

        // Fill both currency dropdowns
        [fromSelect, toSelect].forEach(select => {
            const previousValue = select.value;
            select.replaceChildren();

            currencies.forEach(currency => {
                const option = document.createElement("option");

                option.value = currency.code;
                option.textContent =
                    `${currency.flag} ${currency.code} - ${currency.name}`;

                select.appendChild(option);
            });

            // Preserve the initial selection
            if (currencies.some(c => c.code === previousValue)) {
                select.value = previousValue;
            }
        });

        status.textContent =
            `${currencies.length} currency codes loaded.`;

        convertCurrency();

    } catch (error) {
        status.textContent =
            "Could not load country data. Check your internet connection.";
        console.error(error);
    }
}

// Fetch current available rates using USD as the base
async function loadRates() {
    try {
        const response = await fetch(
            "https://open.er-api.com/v6/latest/USD"
        );

        if (!response.ok) {
            throw new Error("Could not fetch exchange rates.");
        }

        const data = await response.json();

        if (data.result !== "success" || !data.rates) {
            throw new Error("Exchange rates are unavailable.");
        }

        exchangeRates = data.rates;
        ratesDate = data.time_last_update_utc || "Not provided";

        status.textContent =
            "Exchange rates loaded. Last provider update: " + ratesDate;

        convertCurrency();

    } catch (error) {
        result.textContent = "Rates unavailable";
        rateInfo.textContent = "Please try again later.";

        status.textContent =
            "Could not load exchange rates. Check your internet connection.";

        console.error(error);
    }
}

// Convert an amount between two currencies
function convertCurrency() {
    const amountText = amountInput.value.trim();
    const amount = Number(amountText);
    const from = fromSelect.value;
    const to = toSelect.value;

    if (amountText === "" || !Number.isFinite(amount) || amount < 0) {
        result.textContent = "Enter a valid amount";
        rateInfo.textContent = "";
        return;
    }

    if (Object.keys(exchangeRates).length === 0) {
        result.textContent = "Loading rates...";
        return;
    }

    if (
        exchangeRates[from] == null ||
        exchangeRates[to] == null
    ) {
        result.textContent = "Currency not supported";
        rateInfo.textContent =
            "The rate provider does not offer this currency.";
        return;
    }

    // Convert through the USD base rates
    const rate = exchangeRates[to] / exchangeRates[from];
    const convertedAmount = amount * rate;

    if (!Number.isFinite(convertedAmount)) {
        result.textContent = "Conversion unavailable";
        rateInfo.textContent = "";
        return;
    }

    result.textContent =
        `${convertedAmount.toLocaleString(undefined, {
            maximumFractionDigits: 4
        })} ${to}`;

    rateInfo.textContent =
        `1 ${from} = ${rate.toLocaleString(undefined, {
            maximumFractionDigits: 6
        })} ${to}`;
}

// Swap the selected currencies
function swapCurrencies() {
    const previousFrom = fromSelect.value;

    fromSelect.value = toSelect.value;
    toSelect.value = previousFrom;

    convertCurrency();
}

// Connect buttons and inputs to functions
convertButton.addEventListener("click", convertCurrency);
swapButton.addEventListener("click", swapCurrencies);

amountInput.addEventListener("input", convertCurrency);
fromSelect.addEventListener("change", convertCurrency);
toSelect.addEventListener("change", convertCurrency);

// Start loading data
loadCurrencies();
loadRates();
