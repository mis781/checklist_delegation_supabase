import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const calculateTotal = (rate, gst, discount, quantity) => {
  const basePrice = rate * quantity;
  const withDiscount = basePrice - (basePrice * (discount / 100));
  const withGst = withDiscount + (withDiscount * (gst / 100));
  return withGst;
};

export const calculateSubtotal = (items) => {
  return items.reduce((acc, item) => {
    const basePrice = item.rate * item.quantity;
    return acc + (basePrice - (basePrice * ((item.discountPercent || 0) / 100)));
  }, 0).toFixed(2);
};

export const calculateTotalGst = (items) => {
  return items.reduce((acc, item) => {
    const basePrice = item.rate * item.quantity;
    const withDiscount = basePrice - (basePrice * ((item.discountPercent || 0) / 100));
    return acc + (withDiscount * ((item.gstPercent || 0) / 100));
  }, 0).toFixed(2);
};

export const calculateGrandTotal = (items) => {
  const subtotal = parseFloat(calculateSubtotal(items));
  const gst = parseFloat(calculateTotalGst(items));
  return (subtotal + gst).toFixed(2);
};

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

export const parseCustomDate = (dateStr) => {
  if (!dateStr) return new Date(NaN);
  return new Date(dateStr);
};
