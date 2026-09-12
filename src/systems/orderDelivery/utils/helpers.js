// Helper utilities for Petty Cash System

// Generate unique serial numbers (SN-001, SN-002, etc.)
export const generateSerialNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `SN-${String(timestamp).slice(-6)}${String(random).padStart(3, '0')}`;
};

// Generate UUID
export const generateId = () => {
  return `ID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Format date to DD/MM/YYYY
export const formatDate = (dateStr) => {
  if (!dateStr || dateStr === '-' || dateStr === '—' || dateStr === 'null' || dateStr === 'undefined') return '-';
  try {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      const [y, m, d] = dateStr.trim().split('-');
      return `${d}/${m}/${y}`;
    }
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      const [datePart, timePart] = dateStr.split('T');
      if (!timePart || /^00:00(:00)?(\.0+)?(\+00:00|Z)?$/.test(timePart)) {
        const parts = datePart.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return String(dateStr);
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr || '-');
  }
};

// Format date & time to DD/MM/YYYY, hh:mm A (or DD/MM/YYYY if no time or time is 00:00)
export const formatDateTime = (dateStr) => {
  if (!dateStr || dateStr === '-' || dateStr === '—' || dateStr === 'null' || dateStr === 'undefined') return '-';
  try {
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return formatDate(dateStr);
    }
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      const [datePart, timePart] = dateStr.split('T');
      if (!timePart || /^00:00(:00)?(\.0+)?(\+00:00|Z)?$/.test(timePart)) {
        return formatDate(datePart);
      }
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return formatDate(dateStr);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHour = String(hours).padStart(2, '0');

    if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      return `${day}/${month}/${year}`;
    }

    return `${day}/${month}/${year}, ${formattedHour}:${mins} ${ampm}`;
  } catch {
    return formatDate(dateStr);
  }
};

// Format date to YYYY-MM-DD for input
export const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const part = dateStr.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date in YYYY-MM-DD format
export const getTodayDate = () => {
  const today = new Date();
  return formatDateForInput(today);
};

// Get today's date in DD/MM/YYYY format
export const getTodayDateFormatted = () => {
  return formatDate(new Date());
};

// Calculate user balance
export const calculateBalance = (personName, credits, expenses) => {
  const creditAmount = credits
    .filter(c => c.personName === personName)
    .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  
  const expenseAmount = expenses
    .filter(e => e.personName === personName && e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  return creditAmount - expenseAmount;
};

// Get total balance for all
export const getTotalBalance = (credits, expenses) => {
  const totalCredit = credits.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const totalExpense = expenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  return totalCredit - totalExpense;
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

// Validate date range
export const isDateInRange = (date, fromDate, toDate) => {
  const checkDate = new Date(date);
  const startDate = fromDate ? new Date(fromDate) : new Date('1900-01-01');
  const endDate = toDate ? new Date(toDate) : new Date('2099-12-31');
  
  return checkDate >= startDate && checkDate <= endDate;
};

// Shared attachment rules — every upload widget in the app should accept
// both images and PDFs, up to this size, so the limit lives in one place.
export const MAX_ATTACHMENT_SIZE_MB = 10;
export const ATTACHMENT_ACCEPT = 'image/*,application/pdf';

// Validates a picked file against the shared attachment rules. Returns
// an error string to show the user, or null when the file is acceptable.
export const validateAttachmentFile = (file, maxSizeMB = MAX_ATTACHMENT_SIZE_MB) => {
  if (!file) return null;
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File must be less than ${maxSizeMB}MB`;
  }
  return null;
};

// True when a stored data URL is a PDF rather than an image — lets preview/
// viewer UI branch between <img> and a PDF-friendly renderer.
export const isPdfDataUrl = (value) => typeof value === 'string' && value.startsWith('data:application/pdf');

// Base64 image conversion
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Downscale + compress an image file before it gets stored as base64.
// localStorage has a hard ~5-10MB quota for the ENTIRE app, so a single
// uncompressed phone photo (often 3-8MB) can blow the whole quota by itself.
// This resizes to a reasonable max dimension and re-encodes as JPEG, which
// typically shrinks a multi-MB photo down to well under 50KB.
export const compressImageFile = (file, { maxDimension = 600, quality = 0.5 } = {}) => {
  return new Promise((resolve, reject) => {
    // Non-image files (e.g. a PDF slipped through an "image/*" input) can't be
    // drawn to a canvas — fall back to plain base64 rather than failing outright.
    if (!file.type || !file.type.startsWith('image/')) {
      fileToBase64(file).then(resolve).catch(reject);
      return;
    }

    const reader = new FileReader();
    reader.onerror = (error) => reject(error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // If decoding ever fails, still return something rather than blocking the user
        resolve(reader.result);
      };
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        // Guard against a pathological case where re-encoding somehow grows the file
        resolve(compressed.length < reader.result.length ? compressed : reader.result);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};

// Get file name from base64
export const getFileNameFromBase64 = (base64String) => {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  
  return new File([u8arr], `image-${Date.now()}.${mime.split('/')[1]}`, {
    type: mime
  });
};

// Calculate pending count
export const getPendingCount = (expenses) => {
  return expenses.filter(e => e.status === 'PENDING').length;
};

// Get today's expenses
export const getTodaysExpenses = (expenses) => {
  const today = getTodayDate();
  return expenses.filter(e => e.date === today && e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
};

export const getTodaysCredits = (credits) => {
  const today = getTodayDate();
  return credits.filter(c => c.date === today)
    .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
};

// Ledger entry creator
export const createLedgerEntry = (id, personName, type, amount, date, referenceId, balanceAfter) => {
  return {
    id: generateId(),
    personName,
    type, // CREDIT or EXPENSE
    amount: parseFloat(amount),
    date,
    referenceId,
    balanceAfter: parseFloat(balanceAfter),
    timestamp: new Date().toISOString()
  };
};
