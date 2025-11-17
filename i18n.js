#!/usr/bin/env node
/** @format */

import i18next from "i18next";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load translation files synchronously
const en = JSON.parse(readFileSync(join(__dirname, "locales", "en.json"), "utf8"));
const zh = JSON.parse(readFileSync(join(__dirname, "locales", "zh.json"), "utf8"));
const de = JSON.parse(readFileSync(join(__dirname, "locales", "de.json"), "utf8"));

// Initialize i18next immediately with default language (synchronous)
i18next.init({
    lng: "en",
    fallbackLng: "en",
    resources: {
        en: { translation: en },
        zh: { translation: zh },
        de: { translation: de }
    },
    interpolation: {
        escapeValue: false
    },
    initImmediate: false // Synchronous initialization
});

/**
 * Initialize or change i18next language
 * @param {string} language - Language code (en, zh, de)
 */
export function initI18n(language = "en") {
    // Change language if different from current
    if (i18next.language !== language) {
        i18next.changeLanguage(language);
    }
}

/**
 * Get the translation function
 * @returns {Function} i18next.t function
 */
export function t(key, options = {}) {
    return i18next.t(key, options);
}

/**
 * Get current language
 * @returns {string} Current language code
 */
export function getLanguage() {
    return i18next.language || "en";
}

