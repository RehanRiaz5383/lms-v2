/**
 * Currency Configuration
 * Centralized currency settings for the application
 */

export const CURRENCY_CONFIG = {
  symbol: 'PKR',
  code: 'PKR',
  locale: 'en-PK',
  decimalPlaces: 2,
};

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {object} options - Optional formatting options
 * @returns {string} Formatted currency string (e.g., "PKR 1,234.56")
 */
export const formatCurrency = (amount, options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${CURRENCY_CONFIG.symbol} 0.00`;
  }

  const {
    symbol = CURRENCY_CONFIG.symbol,
    decimalPlaces = CURRENCY_CONFIG.decimalPlaces,
    showSymbol = true,
  } = options;

  // Format number with thousand separators
  const formattedNumber = new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);

  // Return with or without symbol
  if (showSymbol) {
    return `${symbol} ${formattedNumber}`;
  }
  
  return formattedNumber;
};

/**
 * Get currency symbol
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = () => {
  return CURRENCY_CONFIG.symbol;
};

