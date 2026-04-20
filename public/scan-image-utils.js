(function () {
  const DEFAULT_MAX_EDGE = 1280;
  const DEFAULT_QUALITY = 0.72;

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode image for resizing."));
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Could not compress image."));
      }, type, quality);
    });
  }

  async function blobToDataUrl(blob) {
    return readFileAsDataUrl(blob);
  }

  async function prepareScanImageForUpload(file, options = {}) {
    const maxEdge = Number(options.maxEdge) || DEFAULT_MAX_EDGE;
    const quality = Number(options.quality) || DEFAULT_QUALITY;
    const outputType = "image/jpeg";
    const originalBytes = file.size;
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await loadImage(objectUrl);
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;

      if (!sourceWidth || !sourceHeight) {
        throw new Error("Image has no readable dimensions.");
      }

      const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        throw new Error("Canvas is not available for image resizing.");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, outputType, quality);
      const imageDataUrl = await blobToDataUrl(blob);

      return {
        imageDataUrl,
        originalBytes,
        uploadBytes: blob.size,
        width,
        height,
        sourceWidth,
        sourceHeight,
        originalType: file.type || "unknown",
        outputType,
        resized: width !== sourceWidth || height !== sourceHeight
      };
    } catch (error) {
      const imageDataUrl = await readFileAsDataUrl(file);
      return {
        imageDataUrl,
        originalBytes,
        uploadBytes: originalBytes,
        width: null,
        height: null,
        sourceWidth: null,
        sourceHeight: null,
        originalType: file.type || "unknown",
        outputType: file.type || "unknown",
        resized: false,
        warning: error instanceof Error ? error.message : "Image resize failed."
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  window.Flip7ScanImage = {
    prepareScanImageForUpload
  };
})();
