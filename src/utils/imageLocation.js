import * as exifr from "exifr";

/**
 * Helper to fetch with an automatic timeout using AbortController.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Extracts GPS coordinates from EXIF metadata of an image file.
 * Uses exifr.gps() which directly extracts latitude and longitude.
 * @param {File} file 
 * @returns {Promise<{latitude: number, longitude: number, capturedAt?: string}|null>}
 */
export async function getExifGps(file) {
  try {
    if (!file || !(file instanceof File)) return null;

    // exifr.gps(file) is the dedicated exifr method for extracting GPS coordinates
    const gpsData = await exifr.gps(file);
    if (gpsData && typeof gpsData.latitude === "number" && typeof gpsData.longitude === "number") {
      let capturedAt = null;
      try {
        // Attempt to parse original capture timestamp
        const parsedData = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
        capturedAt = parsedData?.DateTimeOriginal || parsedData?.CreateDate || null;
      } catch {
        // ignore timestamp error
      }

      return {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        capturedAt: capturedAt ? new Date(capturedAt).toISOString() : null,
      };
    }
  } catch (err) {
    console.warn("EXIF GPS parsing failed/unavailable for file:", file.name, err);
  }
  return null;
}

/**
 * Captures browser's current GPS location using Geolocation API.
 * @returns {Promise<{latitude: number, longitude: number, capturedAt: string}>}
 */
export function getBrowserGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation is not supported by your browser."));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          capturedAt: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        let msg = "Failed to retrieve current location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. GPS access is required to upload proof photos.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location position unavailable. Please enable GPS/location on your device.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please check your GPS signal and try again.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocodes latitude & longitude to a human-readable address.
 * Uses 3.5s AbortController timeouts on all external APIs to prevent blocking.
 * 
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string>}
 */
export async function reverseGeocode(lat, lng) {
  // Provider 1: OpenStreetMap Nominatim
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          "Accept-Language": "en",
        },
      },
      3500
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const area =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.road ||
          addr.village ||
          addr.hamlet ||
          "";
        const city =
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.district ||
          addr.county ||
          addr.state_district ||
          "";
        const state = addr.state || "";

        const parts = Array.from(new Set([area, city, state].filter(Boolean)));
        if (parts.length > 0) {
          return parts.slice(0, 2).join(", ");
        }
        if (data.display_name) {
          return data.display_name.split(",").slice(0, 2).join(",");
        }
      }
    }
  } catch (err) {
    console.warn("Nominatim reverse geocoding timed out or failed:", err);
  }

  // Provider 2: BigDataCloud Reverse Geocode API
  try {
    const res = await fetchWithTimeout(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      {},
      3500
    );
    if (res.ok) {
      const data = await res.json();
      const locality =
        data.locality ||
        data.localityInfo?.informal?.[0]?.name ||
        data.localityInfo?.administrative?.[3]?.name ||
        data.localityInfo?.administrative?.[2]?.name ||
        "";
      const city =
        data.city ||
        data.localityInfo?.administrative?.[1]?.name ||
        data.principalSubdivision ||
        "";
      const state = data.principalSubdivision || "";

      const parts = Array.from(new Set([locality, city, state].filter(Boolean)));
      if (parts.length > 0) {
        return parts.slice(0, 2).join(", ");
      }
    }
  } catch (e) {
    console.warn("BigDataCloud reverse geocode timed out or failed:", e);
  }

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Main helper to retrieve location metadata for a photo upload.
 * MANDATORY: Throws an error if GPS location cannot be acquired.
 * 
 * @param {File} file 
 * @param {"camera"|"gallery"} sourceHint 
 * @returns {Promise<{
 *   fileName: string,
 *   latitude: number,
 *   longitude: number,
 *   address: string,
 *   locationSource: string,
 *   gpsSource: string,
 *   capturedAt: string
 * }>}
 */
export async function getImageLocationMeta(file, sourceHint = "gallery") {
  const isImage = file.type?.startsWith("image/");
  if (!isImage) {
    // Non-image document (PDF, Excel, etc.) - return dummy or browser GPS if available
    try {
      const bGps = await getBrowserGps();
      const addr = await reverseGeocode(bGps.latitude, bGps.longitude);
      return {
        fileName: file.name,
        latitude: bGps.latitude,
        longitude: bGps.longitude,
        address: addr,
        locationSource: "document",
        gpsSource: "browser",
        capturedAt: bGps.capturedAt,
      };
    } catch {
      return null;
    }
  }

  let lat = null;
  let lng = null;
  let capturedAt = null;
  let gpsSource = "browser";

  if (sourceHint === "gallery") {
    // Attempt 1: Parse EXIF GPS
    const exifData = await getExifGps(file);
    if (exifData) {
      lat = exifData.latitude;
      lng = exifData.longitude;
      capturedAt = exifData.capturedAt;
      gpsSource = "exif";
    }
  }

  // Fallback / Camera mode: Browser GPS
  if (lat === null || lng === null) {
    const browserLocation = await getBrowserGps();
    lat = browserLocation.latitude;
    lng = browserLocation.longitude;
    capturedAt = capturedAt || browserLocation.capturedAt;
    gpsSource = "browser";
  }

  if (lat === null || lng === null) {
    throw new Error("Location permission is required for each proof photo.");
  }

  const address = await reverseGeocode(lat, lng);

  return {
    fileName: file.name,
    latitude: lat,
    longitude: lng,
    address,
    locationSource: sourceHint,
    gpsSource,
    capturedAt: capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString(),
  };
}
