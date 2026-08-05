/**
 * bakeLocationWatermark.js
 * Draws a GPS Map Camera-style watermark onto an image File using HTML Canvas.
 * 
 * @param {File} file Original image file
 * @param {{
 *   latitude: number,
 *   longitude: number,
 *   address?: string,
 *   capturedAt?: string,
 *   gpsSource?: string,
 *   locationSource?: string
 * }} locationMeta
 * @returns {Promise<File>} New File object containing the watermarked image
 */
export async function bakeLocationWatermark(file, locationMeta) {
  if (!file || !file.type?.startsWith("image/")) {
    return file; // Return original if non-image
  }

  if (!locationMeta || typeof locationMeta.latitude !== "number" || typeof locationMeta.longitude !== "number") {
    return file; // Return original if missing coordinates
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return resolve(file);
      }

      // 1. Draw original photo
      ctx.drawImage(img, 0, 0, width, height);

      // 2. Compute scaling ratio relative to a standard 1000px width
      const scale = Math.max(0.6, width / 1000);

      // 3. Format Date & Time strings
      const rawDate = locationMeta.capturedAt ? new Date(locationMeta.capturedAt) : new Date();
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[rawDate.getDay()];
      
      const pad = (n) => String(n).padStart(2, "0");
      const dateStr = `${pad(rawDate.getDate())}/${pad(rawDate.getMonth() + 1)}/${rawDate.getFullYear()}`;
      
      let hours = rawDate.getHours();
      const minutes = pad(rawDate.getMinutes());
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const timeStr = `${pad(hours)}:${minutes} ${ampm}`;
      
      const formattedDateTime = `${dayName}, ${dateStr} ${timeStr} GMT+05:30`;

      // 4. Format Address lines
      const fullAddress = locationMeta.address || `${locationMeta.latitude.toFixed(4)}, ${locationMeta.longitude.toFixed(4)}`;
      const addressParts = fullAddress.split(",").map((s) => s.trim());
      
      // Line 1: Primary City/State/Country
      let mainTitle = addressParts.slice(0, 3).join(", ");
      if (!mainTitle.includes("India")) mainTitle += ", India 🇮🇳";
      else mainTitle += " 🇮🇳";

      // Line 2: Detailed address
      const detailAddress = fullAddress;

      // Line 3: Lat/Long
      const latStr = locationMeta.latitude >= 0 ? `${locationMeta.latitude.toFixed(5)}°` : `${Math.abs(locationMeta.latitude).toFixed(5)}°S`;
      const lngStr = locationMeta.longitude >= 0 ? `${locationMeta.longitude.toFixed(5)}°` : `${Math.abs(locationMeta.longitude).toFixed(5)}°W`;
      const coordsStr = `Lat ${latStr} Long ${lngStr}`;

      // 5. Panel Dimensions (Bottom Left Box matching GPS Map Camera reference)
      const boxMargin = Math.round(20 * scale);
      const boxPadding = Math.round(14 * scale);
      const mapSize = Math.round(110 * scale);
      const boxWidth = Math.min(width - boxMargin * 2, Math.round(620 * scale));
      const boxHeight = Math.round(140 * scale);
      const boxX = boxMargin;
      const boxY = height - boxHeight - boxMargin;
      const borderRadius = Math.round(12 * scale);

      // Draw Dark Translucent Box Background
      ctx.save();
      ctx.fillStyle = "rgba(18, 22, 28, 0.65)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 12 * scale;
      ctx.shadowOffsetY = 4 * scale;
      
      // Rounded Rectangle for overlay box
      ctx.beginPath();
      ctx.moveTo(boxX + borderRadius, boxY);
      ctx.lineTo(boxX + boxWidth - borderRadius, boxY);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + borderRadius);
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight - borderRadius);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - borderRadius, boxY + boxHeight);
      ctx.lineTo(boxX + borderRadius, boxY + boxHeight);
      ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - borderRadius);
      ctx.lineTo(boxX, boxY + borderRadius);
      ctx.quadraticCurveTo(boxX, boxY, boxX + borderRadius, boxY);
      ctx.closePath();
      ctx.fill();

      // Border stroke
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
      ctx.stroke();
      ctx.restore();

      // 6. Map Thumbnail (Left side of box)
      const mapX = boxX + boxPadding;
      const mapY = boxY + (boxHeight - mapSize) / 2;
      const mapRadius = Math.round(8 * scale);

      // Fetch static map tile image
      let mapLoaded = false;
      try {
        const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${locationMeta.latitude},${locationMeta.longitude}&zoom=15&size=180x180&markers=${locationMeta.latitude},${locationMeta.longitude},ol-marker-red`;
        const mapImg = new Image();
        mapImg.crossOrigin = "anonymous";
        
        await new Promise((res) => {
          mapImg.onload = () => {
            res(true);
          };
          mapImg.onerror = () => {
            res(false);
          };
          mapImg.src = mapUrl;
          setTimeout(() => res(false), 2500); // 2.5s timeout for map tile
        });

        if (mapImg.complete && mapImg.naturalWidth > 0) {
          ctx.save();
          // Clip map to rounded rect
          ctx.beginPath();
          ctx.moveTo(mapX + mapRadius, mapY);
          ctx.lineTo(mapX + mapSize - mapRadius, mapY);
          ctx.quadraticCurveTo(mapX + mapSize, mapY, mapX + mapSize, mapY + mapRadius);
          ctx.lineTo(mapX + mapSize, mapY + mapSize - mapRadius);
          ctx.quadraticCurveTo(mapX + mapSize, mapY + mapSize, mapX + mapSize - mapRadius, mapY + mapSize);
          ctx.lineTo(mapX + mapRadius, mapY + mapSize);
          ctx.quadraticCurveTo(mapX, mapY + mapSize, mapX, mapY + mapSize - mapRadius);
          ctx.lineTo(mapX, mapY + mapRadius);
          ctx.quadraticCurveTo(mapX, mapY, mapX + mapRadius, mapY);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(mapImg, mapX, mapY, mapSize, mapSize);
          ctx.restore();

          // Draw Map Data attribution watermark over map tile
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(mapX, mapY + mapSize - Math.round(18 * scale), mapSize, Math.round(18 * scale));
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(10 * scale)}px sans-serif`;
          ctx.fillText("Map Data", mapX + Math.round(6 * scale), mapY + mapSize - Math.round(5 * scale));
          
          mapLoaded = true;
        }
      } catch {
        mapLoaded = false;
      }

      // Map Fallback (Stylized Dark Map placeholder with Pin Icon if tile fails to load)
      if (!mapLoaded) {
        ctx.save();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(mapX + mapRadius, mapY);
        ctx.lineTo(mapX + mapSize - mapRadius, mapY);
        ctx.quadraticCurveTo(mapX + mapSize, mapY, mapX + mapSize, mapY + mapRadius);
        ctx.lineTo(mapX + mapSize, mapY + mapSize - mapRadius);
        ctx.quadraticCurveTo(mapX + mapSize, mapY + mapSize, mapX + mapSize - mapRadius, mapY + mapSize);
        ctx.lineTo(mapX + mapRadius, mapY + mapSize);
        ctx.quadraticCurveTo(mapX, mapY + mapSize, mapX, mapY + mapSize - mapRadius);
        ctx.lineTo(mapX, mapY + mapRadius);
        ctx.quadraticCurveTo(mapX, mapY, mapX + mapRadius, mapY);
        ctx.closePath();
        ctx.fill();

        // Draw pin icon in center
        const pinCenterX = mapX + mapSize / 2;
        const pinCenterY = mapY + mapSize / 2 - 6 * scale;
        
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(pinCenterX, pinCenterY, 12 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pinCenterX, pinCenterY, 5 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#94a3b8";
        ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("GPS MAP", pinCenterX, mapY + mapSize - 8 * scale);
        ctx.restore();
      }

      // 7. Draw Text Content (Right side of Map)
      const textX = mapX + mapSize + Math.round(14 * scale);
      const textMaxW = boxX + boxWidth - textX - boxPadding;
      let currentY = boxY + Math.round(26 * scale);

      // Line 1: Main Title (Bold White)
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(16 * scale)}px sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(mainTitle, textX, currentY, textMaxW);

      // Line 2: Full Address (Light Grey, smaller)
      currentY += Math.round(22 * scale);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = `${Math.round(11 * scale)}px sans-serif`;
      ctx.fillText(detailAddress, textX, currentY, textMaxW);

      // Line 3: Lat/Long Coordinates
      currentY += Math.round(20 * scale);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = `${Math.round(12 * scale)}px sans-serif`;
      ctx.fillText(coordsStr, textX, currentY, textMaxW);

      // Line 4: Date & Time
      currentY += Math.round(20 * scale);
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${Math.round(11 * scale)}px sans-serif`;
      ctx.fillText(formattedDateTime, textX, currentY, textMaxW);

      // 8. GPS Map Camera Branding Badge (Top-Right corner inside box)
      const badgeX = boxX + boxWidth - Math.round(110 * scale);
      const badgeY = boxY + Math.round(10 * scale);
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(badgeX, badgeY, Math.round(100 * scale), Math.round(18 * scale), Math.round(4 * scale));
      } else {
        ctx.rect(badgeX, badgeY, Math.round(100 * scale), Math.round(18 * scale));
      }
      ctx.fill();

      ctx.fillStyle = "#38bdf8";
      ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("📷 GPS Map Camera", badgeX + Math.round(50 * scale), badgeY + Math.round(12 * scale));

      // 9. Convert Canvas to Blob & File
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }
          const watermarkedFile = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(watermarkedFile);
        },
        "image/jpeg",
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
