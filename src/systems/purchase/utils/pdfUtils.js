/**
 * Common PDF utilities, number formatters, and amount-in-words converters
 * for the Nutech Purchase System PDF generation modules.
 */

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const convertBelowThousand = (n) => {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertBelowThousand(n % 100) : "");
};

/**
 * Converts a number to Indian numbering system words (Lakh, Crore)
 */
export const numberToWords = (num) => {
  if (!num || isNaN(num) || num === 0) return "Zero";
  let n = Math.floor(Math.abs(num));
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const rest = n;

  let out = "";
  if (crore) out += convertBelowThousand(crore) + " Crore ";
  if (lakh) out += convertBelowThousand(lakh) + " Lakh ";
  if (thousand) out += convertBelowThousand(thousand) + " Thousand ";
  if (rest) out += convertBelowThousand(rest);
  return out.trim();
};

/**
 * Format currency amount into official Indian Rupees wording
 */
export const amountInWords = (amount) => {
  const num = Number(amount) || 0;
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let words = `INR ${numberToWords(rupees)} Rupees`;
  if (paise > 0) words += ` and ${numberToWords(paise)} Paise`;
  return `${words} Only`;
};

/**
 * Format number into Indian currency decimal format e.g. 12,34,567.89
 */
export const money = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format date as DD-MM-YYYY
 */
export const formatPdfDateDash = (dateVal) => {
  if (!dateVal) return "-";
  if (typeof dateVal === "string" && /^\d{2}-\d{2}-\d{4}$/.test(dateVal.trim())) {
    return dateVal.trim();
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return String(dateVal);
  }
};

/**
 * Format date nicely for PDF headers
 */
export const formatPdfDate = (dateVal) => {
  if (!dateVal) {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateVal);
  }
};

/**
 * Loads an image (imported asset path or URL) and converts it to a PNG base64 data URL
 * so that jsPDF can render it synchronously or asynchronously without cross-origin/format issues.
 */
export const loadImageAsDataUrl = (src) => {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    if (typeof src === "string" && src.startsWith("data:")) return resolve(src);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        resolve(src);
      }
    };
    img.onerror = () => {
      resolve(src);
    };
    img.src = src;
  });
};
