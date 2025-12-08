// Country and currency configuration for Q-Payroll
export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  isEastAfrican?: boolean;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
}

// East African countries (priority display)
export const EAST_AFRICAN_COUNTRIES: Country[] = [
  { code: "UG", name: "Uganda", currency: "UGX", currencySymbol: "USh", isEastAfrican: true },
  { code: "KE", name: "Kenya", currency: "KSH", currencySymbol: "KSh", isEastAfrican: true },
  { code: "TZ", name: "Tanzania", currency: "TZS", currencySymbol: "TSh", isEastAfrican: true },
  { code: "RW", name: "Rwanda", currency: "RWF", currencySymbol: "RWF", isEastAfrican: true },
  { code: "SS", name: "South Sudan", currency: "SSP", currencySymbol: "SSP", isEastAfrican: true },
];

// Other common countries
export const OTHER_COUNTRIES: Country[] = [
  { code: "US", name: "United States", currency: "USD", currencySymbol: "$" },
  { code: "GB", name: "United Kingdom", currency: "GBP", currencySymbol: "£" },
  { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "C$" },
  { code: "AU", name: "Australia", currency: "AUD", currencySymbol: "A$" },
  { code: "DE", name: "Germany", currency: "EUR", currencySymbol: "€" },
  { code: "FR", name: "France", currency: "EUR", currencySymbol: "€" },
  { code: "NL", name: "Netherlands", currency: "EUR", currencySymbol: "€" },
  { code: "SE", name: "Sweden", currency: "SEK", currencySymbol: "kr" },
];

// Combined countries list with EA countries first
export const ALL_COUNTRIES: Country[] = [...EAST_AFRICAN_COUNTRIES, ...OTHER_COUNTRIES];

// Currency definitions
export const CURRENCIES: Currency[] = [
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", decimalPlaces: 0 },
  { code: "KSH", name: "Kenyan Shilling", symbol: "KSh", decimalPlaces: 2 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", decimalPlaces: 0 },
  { code: "RWF", name: "Rwandan Franc", symbol: "RWF", decimalPlaces: 0 },
  { code: "SSP", name: "South Sudanese Pound", symbol: "SSP", decimalPlaces: 2 },
  { code: "USD", name: "US Dollar", symbol: "$", decimalPlaces: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimalPlaces: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimalPlaces: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", decimalPlaces: 2 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", decimalPlaces: 2 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", decimalPlaces: 2 },
];

// Helper functions
export const getCountryByCode = (code: string): Country | undefined => 
  ALL_COUNTRIES.find(country => country.code === code);

export const getCountryByName = (name: string): Country | undefined => 
  ALL_COUNTRIES.find(country => country.name === name);

export const getCurrencyByCode = (code: string): Currency | undefined => 
  CURRENCIES.find(currency => currency.code === code);

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return amount.toString();
  
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  });
  return `${currency.symbol}${formatted}`;
};

// Helper function to get currency symbol for a given currency code
export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  return currency?.symbol || currencyCode;
};

// Helper function to get currency code from country name
export const getCurrencyCodeFromCountry = (countryName: string): string => {
  const country = getCountryByName(countryName);
  return country?.currency || 'UGX'; // default to UGX
};

// Helper function to get currency code from country code (e.g., "UG" -> "UGX")
export const getCurrencyCodeFromCountryCode = (countryCode: string): string => {
  const country = getCountryByCode(countryCode);
  return country?.currency || 'UGX'; // default to UGX
};

// Helper function to get default currency for a country code
export const getDefaultCurrencyForCountry = (countryCode: string): Currency | undefined => {
  const currencyCode = getCurrencyCodeFromCountryCode(countryCode);
  return getCurrencyByCode(currencyCode);
};

// Piece rate options for enhanced piece-rate system
export const PIECE_RATE_TYPES = [
  { value: "crates", label: "Crates" },
  { value: "boxes", label: "Boxes" },
  { value: "units", label: "Units" },
  { value: "packages", label: "Packages" },
  { value: "items", label: "Items" },
  { value: "tons", label: "Tons" },
  { value: "kilograms", label: "Kilograms" },
  { value: "custom", label: "Custom" },
];
