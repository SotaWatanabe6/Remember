"use client";

import Image from "next/image";
import { isBrowserImageUrl, memorialInitial } from "@/lib/memorialCoverImage.js";

/**
 * Renders memorial cover portrait or a name initial fallback.
 */
export default function MemorialCoverImage({
  src,
  name = "",
  alt,
  className = "",
  fill = false,
  width,
  height,
  rounded = "rounded-full",
  fallbackClassName = "bg-r-shape text-r-btn-text",
}) {
  const displayUrl = isBrowserImageUrl(src) ? src.trim() : null;
  const initial = memorialInitial(name);
  const altText = alt || (name ? `Portrait of ${name}` : "Memorial portrait");

  if (!displayUrl) {
    return (
      <div
        className={`flex items-center justify-center ${rounded} ${fallbackClassName} ${className}`}
        aria-label={altText}
      >
        <span className="font-medium" aria-hidden="true">
          {initial}
        </span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={displayUrl}
        alt={altText}
        fill
        unoptimized
        className={`object-cover ${rounded} ${className}`}
      />
    );
  }

  return (
    <img
      src={displayUrl}
      alt={altText}
      width={width}
      height={height}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}
