// Small shared helpers used across the Master data module

/**
 * Generates a reasonably unique id for client-side records.
 * Not cryptographically unique, but sufficient for local demo/storage data.
 */
export function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Reads a File/Blob (e.g. from an <input type="file">) and resolves
 * with its base64 data URL, so it can be stored/rendered directly.
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
