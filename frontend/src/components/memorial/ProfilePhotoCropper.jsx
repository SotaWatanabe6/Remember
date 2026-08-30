"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  clampCrop,
  cropToSquareFile,
  imageStyleFor,
  loadImageFromFile,
  zoomCrop,
} from "@/lib/imageCrop.js";

const PAN_STEP = 0.02;
const ZOOM_STEP = 0.1;

/**
 * Circular crop editor for the profile photo.
 * The organizer pans and zooms the original image; the circle shows exactly
 * what will be visible wherever the portrait is rendered as a circle.
 */
export default function ProfilePhotoCropper({
  file,
  initialCrop = DEFAULT_CROP,
  onCancel,
  onApply,
}) {
  const stageRef = useRef(null);
  const dialogRef = useRef(null);
  const imageRef = useRef(null);
  const pointersRef = useRef(new Map());
  const dragRef = useRef(null);
  const pinchRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [crop, setCrop] = useState(() => ({ ...DEFAULT_CROP, ...initialCrop }));
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load the original file once; every adjustment re-reads from this image so
  // repeated edits never compound compression.
  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    let url = null;

    loadImageFromFile(file)
      .then(({ image, objectUrl }) => {
        url = objectUrl;
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        imageRef.current = image;
        setPreviewUrl(objectUrl);
        setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
        setCrop((current) =>
          clampCrop(current, image.naturalWidth, image.naturalHeight),
        );
        setErrorMessage("");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err.message || "We could not open that image.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      imageRef.current = null;
    };
  }, [file]);

  const applyCrop = useCallback(
    (next) => {
      setCrop((current) => {
        const merged = typeof next === "function" ? next(current) : next;
        return clampCrop(merged, naturalSize?.width ?? 1, naturalSize?.height ?? 1);
      });
    },
    [naturalSize],
  );

  const applyZoomTo = useCallback(
    (fromCrop, nextZoom) =>
      zoomCrop(fromCrop, nextZoom, naturalSize?.width ?? 1, naturalSize?.height ?? 1),
    [naturalSize],
  );

  const applyZoom = useCallback(
    (nextZoom, fromCrop) => {
      setCrop((current) => applyZoomTo(fromCrop ?? current, nextZoom));
    },
    [applyZoomTo],
  );

  // Escape to close, and keep the page behind the dialog from scrolling.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  // Wheel zoom needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || status !== "ready") return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setCrop((current) => applyZoomTo(current, current.zoom + direction * ZOOM_STEP));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [applyZoomTo, status]);

  const startDrag = (pointer) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      startX: pointer.x,
      startY: pointer.y,
      startCrop: crop,
      width: rect.width || 1,
      height: rect.height || 1,
    };
  };

  const handlePointerDown = (event) => {
    if (status !== "ready") return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = [...pointersRef.current.values()];
    if (points.length === 1) {
      startDrag(points[0]);
    } else if (points.length === 2) {
      dragRef.current = null;
      pinchRef.current = {
        startDistance: Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y,
        ) || 1,
        startCrop: crop,
      };
    }
  };

  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const points = [...pointersRef.current.values()];

    if (points.length >= 2 && pinchRef.current) {
      const distance =
        Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
      const { startDistance, startCrop } = pinchRef.current;
      applyZoom((distance / startDistance) * startCrop.zoom, startCrop);
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const point = points[0];
    applyCrop({
      zoom: drag.startCrop.zoom,
      offsetXRatio:
        drag.startCrop.offsetXRatio + (point.x - drag.startX) / drag.width,
      offsetYRatio:
        drag.startCrop.offsetYRatio + (point.y - drag.startY) / drag.height,
    });
  };

  const handlePointerUp = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    const points = [...pointersRef.current.values()];

    if (points.length < 2) pinchRef.current = null;
    if (points.length === 0) {
      dragRef.current = null;
    } else {
      // Re-anchor the drag to whichever finger is still down.
      startDrag(points[0]);
    }
  };

  const handleKeyDown = (event) => {
    if (status !== "ready") return;
    const pan = (dx, dy) => {
      event.preventDefault();
      applyCrop((current) => ({
        ...current,
        offsetXRatio: current.offsetXRatio + dx,
        offsetYRatio: current.offsetYRatio + dy,
      }));
    };
    const zoomBy = (delta) => {
      event.preventDefault();
      setCrop((current) => applyZoomTo(current, current.zoom + delta));
    };

    switch (event.key) {
      case "ArrowLeft":
        pan(-PAN_STEP, 0);
        break;
      case "ArrowRight":
        pan(PAN_STEP, 0);
        break;
      case "ArrowUp":
        pan(0, -PAN_STEP);
        break;
      case "ArrowDown":
        pan(0, PAN_STEP);
        break;
      case "+":
      case "=":
        zoomBy(ZOOM_STEP);
        break;
      case "-":
      case "_":
        zoomBy(-ZOOM_STEP);
        break;
      default:
        break;
    }
  };

  const handleApply = async () => {
    if (status !== "ready" || !imageRef.current || isSaving) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const croppedFile = await cropToSquareFile(imageRef.current, file, crop);
      onApply?.({ file: croppedFile, crop });
    } catch (err) {
      setErrorMessage(err.message || "We could not save the cropped photo.");
      setIsSaving(false);
    }
  };

  const imageStyle = naturalSize
    ? imageStyleFor(crop, naturalSize.width, naturalSize.height)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: "rgba(66,63,57,0.45)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-cropper-title"
        tabIndex={-1}
        className="max-h-full w-full max-w-[440px] overflow-y-auto rounded-[24px] bg-r-modal p-6 shadow-xl outline-none sm:p-8"
      >
        <h2
          id="photo-cropper-title"
          className="font-family-display text-[24px] leading-[28px] text-r-text"
        >
          Position the photo
        </h2>
        <p className="mt-2 font-family-body text-[16px] leading-[22px] text-r-secondary">
          Drag the photo and zoom until their face sits inside the circle. Only
          what is inside the circle is shown on the memorial.
        </p>

        <div className="mt-6 flex justify-center">
          <div
            ref={stageRef}
            role="group"
            tabIndex={0}
            aria-label="Photo crop area. Drag to reposition, arrow keys to nudge, plus and minus to zoom."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyDown}
            className="relative aspect-square w-full max-w-[300px] touch-none select-none overflow-hidden rounded-[20px] bg-[#E8E0D8] outline-none focus-visible:ring-2 focus-visible:ring-r-border-focus"
            style={{ cursor: status === "ready" ? "grab" : "default" }}
          >
            {previewUrl && imageStyle ? (
              <img
                src={previewUrl}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={imageStyle}
              />
            ) : null}

            {/* Circular guide: everything outside it is dimmed. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80"
              style={{ boxShadow: "0 0 0 9999px rgba(66,63,57,0.5)" }}
            />

            {status === "loading" ? (
              <div className="absolute inset-0 flex items-center justify-center font-family-body text-[16px] text-r-secondary">
                Loading photo...
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <label
            htmlFor="photo-zoom"
            className="font-family-body text-[16px] leading-[16px] text-r-secondary"
          >
            Zoom
          </label>
          <input
            id="photo-zoom"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={crop.zoom}
            disabled={status !== "ready"}
            onChange={(event) => applyZoom(Number(event.target.value))}
            className="h-1 flex-1 cursor-pointer accent-[#5F5A52] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => applyCrop(DEFAULT_CROP)}
            disabled={status !== "ready"}
            className="font-family-body text-[16px] leading-[16px] text-r-secondary underline underline-offset-4 transition hover:text-r-text disabled:opacity-50"
          >
            Reset
          </button>
        </div>

        {errorMessage ? (
          <p role="alert" className="mt-4 text-sm leading-5 text-r-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-r-border py-3 font-family-body text-[16px] leading-[16px] text-r-secondary transition hover:bg-r-card"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={status !== "ready" || isSaving}
            className="flex-1 rounded-full bg-r-btn py-3 font-family-body text-[16px] font-medium leading-[16px] text-r-btn-text transition hover:brightness-95 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Use this photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
