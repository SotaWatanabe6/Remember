"use client";

import { useState, useRef, useCallback } from "react";

const UploadIcon = () => (
  <svg
    width="53"
    height="53"
    viewBox="0 0 53 53"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.83398 26.5013V44.168C8.83398 45.3393 9.29931 46.4627 10.1276 47.291C10.9559 48.1193 12.0793 48.5846 13.2507 48.5846H39.7506C40.922 48.5846 42.0454 48.1193 42.8737 47.291C43.702 46.4627 44.1673 45.3393 44.1673 44.168V26.5013M17.6673 13.2513L26.5007 4.41797L35.334 13.2513M26.5007 4.41797L26.5006 33.1263"
      stroke="#1E1E1E"
      strokeWidth="5.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function UploadArea() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const maxFiles = 10;

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(
      (f) =>
        ["image/png", "image/jpeg"].includes(f.type) &&
        f.size <= 5 * 1024 * 1024,
    );
    setFiles((prev) => [...prev, ...valid].slice(0, maxFiles));
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const borderColor = isDragging ? "#3B82F6" : "#D1D5DB";
  const bgColor = isDragging ? "#EFF6FF" : "#FFFFFF";

  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className="relative cursor-pointer rounded-xl transition-all duration-200"
        style={{ backgroundColor: bgColor }}
      >
        {/* SVG dashed border */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            width="100%"
            height="100%"
            rx="12"
            ry="12"
            fill="none"
            stroke={borderColor}
            strokeWidth="2"
            strokeDasharray="12 8"
          />
        </svg>

        {/* Content */}
        <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-10">
          <input
            ref={inputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div
            className={`p-3 rounded-full transition-colors duration-200
            ${isDragging ? "bg-blue-100 text-blue-500" : "text-gray-500"}`}
          >
            <UploadIcon />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-gray-700">
              Click to upload or drag and drop
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={i}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm"
            >
              <span className="text-gray-400">
                <FileIcon />
              </span>
              <span className="flex-1 truncate text-gray-700 font-medium">
                {file.name}
              </span>
              <span className="text-gray-400 text-xs shrink-0">
                {formatSize(file.size)}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <XIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
