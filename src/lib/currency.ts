/**
 * Format a number as Kenyan Shillings (KSH)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format a number as KSH with decimal places
 */
export const formatCurrencyWithDecimals = (amount: number): string => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Parse a currency string to a number
 */
export const parseCurrency = (value: string): number => {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[KES,\s]/g, "");
  return parseFloat(cleaned) || 0;
};
