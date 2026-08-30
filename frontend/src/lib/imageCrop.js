/**
 * Geometry + canvas helpers for the circular profile-photo cropper.
 *
 * Crop state is stored in viewport-relative ratios so it survives a resize of
 * the editor and can be re-applied later without touching the original file:
 *   zoom          1 = image fills the square viewport ("cover"), higher = closer
 *   offsetXRatio  horizontal pan, as a fraction of the viewport width
 *   offsetYRatio  vertical pan, as a fraction of the viewport height
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const MAX_OUTPUT_SIZE = 1024;
export const DEFAULT_CROP = { zoom: 1, offsetXRatio: 0, offsetYRatio: 0 };

export function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Size of the rendered image relative to the square viewport, at a given zoom.
 * At zoom 1 the shorter side matches the viewport (object-cover behaviour).
 */
export function displayRatios(naturalWidth, naturalHeight, zoom) {
  if (!naturalWidth || !naturalHeight) return { rx: 1, ry: 1 };
  const safeZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  return {
    rx: safeZoom * Math.max(1, naturalWidth / naturalHeight),
    ry: safeZoom * Math.max(1, naturalHeight / naturalWidth),
  };
}

/** How far the image may be panned before an edge would enter the viewport. */
export function maxOffsets(naturalWidth, naturalHeight, zoom) {
  const { rx, ry } = displayRatios(naturalWidth, naturalHeight, zoom);
  return { x: Math.max(0, (rx - 1) / 2), y: Math.max(0, (ry - 1) / 2) };
}

/** Keeps the viewport covered by the image at all times. */
export function clampCrop(crop, naturalWidth, naturalHeight) {
  const zoom = clamp(crop?.zoom ?? 1, MIN_ZOOM, MAX_ZOOM);
  const limits = maxOffsets(naturalWidth, naturalHeight, zoom);
  return {
    zoom,
    offsetXRatio: clamp(crop?.offsetXRatio ?? 0, -limits.x, limits.x),
    offsetYRatio: clamp(crop?.offsetYRatio ?? 0, -limits.y, limits.y),
  };
}

/**
 * Changes zoom while keeping whatever sits under the centre of the circle in
 * place, instead of letting the image drift away from the chosen subject.
 */
export function zoomCrop(crop, nextZoom, naturalWidth, naturalHeight) {
  const currentZoom = clamp(crop?.zoom ?? 1, MIN_ZOOM, MAX_ZOOM) || 1;
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const scale = zoom / currentZoom;
  return clampCrop(
    {
      zoom,
      offsetXRatio: (crop?.offsetXRatio ?? 0) * scale,
      offsetYRatio: (crop?.offsetYRatio ?? 0) * scale,
    },
    naturalWidth,
    naturalHeight,
  );
}

/** CSS box (percentages) for the <img> inside the square viewport. */
export function imageStyleFor(crop, naturalWidth, naturalHeight) {
  const safe = clampCrop(crop, naturalWidth, naturalHeight);
  const { rx, ry } = displayRatios(naturalWidth, naturalHeight, safe.zoom);
  return {
    width: `${rx * 100}%`,
    height: `${ry * 100}%`,
    left: `${((1 - rx) / 2 + safe.offsetXRatio) * 100}%`,
    top: `${((1 - ry) / 2 + safe.offsetYRatio) * 100}%`,
  };
}

/** The square region of the original image that the viewport is showing. */
export function cropRect(crop, naturalWidth, naturalHeight) {
  const safe = clampCrop(crop, naturalWidth, naturalHeight);
  const { rx, ry } = displayRatios(naturalWidth, naturalHeight, safe.zoom);
  const size = naturalWidth / rx;
  return {
    size,
    x: size * ((rx - 1) / 2 - safe.offsetXRatio),
    y: size * ((ry - 1) / 2 - safe.offsetYRatio),
  };
}

/** Loads a File into an <img>. Browsers apply EXIF orientation here and in
 *  canvas drawImage, so what is previewed is what gets written out. */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("We could not open that image. Try a JPG or PNG file."));
    };
    image.src = objectUrl;
  });
}

function outputTypeFor(file) {
  return file?.type === "image/png"
    ? { mimeType: "image/png", extension: "png", quality: undefined }
    : { mimeType: "image/jpeg", extension: "jpg", quality: 0.92 };
}

function croppedFileName(originalName, extension) {
  const base = String(originalName || "profile-photo").replace(/\.[^.]+$/, "");
  return `${base || "profile-photo"}-cropped.${extension}`;
}

/**
 * Renders the selected region to a square file ready for upload.
 * Never upscales: the output is at most the size of the region that was picked.
 */
export function cropToSquareFile(image, originalFile, crop) {
  const rect = cropRect(crop, image.naturalWidth, image.naturalHeight);
  const outputSize = Math.max(1, Math.min(MAX_OUTPUT_SIZE, Math.round(rect.size)));

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("Your browser could not prepare the cropped photo."));
  context.imageSmoothingQuality = "high";

  const { mimeType, extension, quality } = outputTypeFor(originalFile);
  if (mimeType === "image/jpeg") {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, outputSize, outputSize);
  }

  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.size,
    rect.size,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("We could not save the cropped photo. Please try again."));
          return;
        }
        resolve(
          new File([blob], croppedFileName(originalFile?.name, extension), {
            type: mimeType,
            lastModified: Date.now(),
          }),
        );
      },
      mimeType,
      quality,
    );
  });
}
