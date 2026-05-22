// PhotoUpload.jsx
// Handles photo uploads for contributors
// Includes drag and drop, preview grid, optional caption
"use client"

import { useState, useRef, useCallback } from "react"
import { uploadFiles } from "@/lib/api"

export default function PhotoUpload({ onBack, memorialId, contributorId }) {
  const [photos, setPhotos] = useState([])
  const [caption, setCaption] = useState("")
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState({ msg: "", type: "" })
  const inputRef = useRef()

  const addFiles = useCallback((files) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"))
    setPhotos((prev) => [
      ...prev,
      ...imgs.map((f) => ({
        file: f,
        url:  URL.createObjectURL(f),
        id:   crypto.randomUUID(),
      })),
    ])
  }, [])

  const removePhoto = (id) => setPhotos((prev) => prev.filter((p) => p.id !== id))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (photos.length === 0) return
    setUploading(true)
    setStatus({ msg: "", type: "" })
    try {
      const data = await uploadFiles(
        photos.map((p) => p.file),
        "photo",
        memorialId,
        contributorId,
        null,           // no contributorTitle for photos
        caption.trim()  // optional caption
      )
      const success = data.uploads.filter((u) => u.status === "success").length
      setStatus({
        msg:  `${success} of ${data.uploads.length} photos uploaded successfully`,
        type: "success",
      })
      if (success === data.uploads.length) {
        setPhotos([])
        setCaption("")
      }
    } catch {
      setStatus({ msg: "Upload failed. Please try again.", type: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 pt-0 pb-0 border-t-0 border-gray-200">
        <span className="text-sm font-medium text-gray-900 tracking-tight">Remember</span>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
      </nav>

      <div className="flex flex-col items-center px-6 pt-12 pb-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-2 text-center">
          Upload your memories
        </h1>
        <p className="text-sm text-gray-400 mb-10 text-center">Upload photos below.</p>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`
            w-full max-w-md border-2 border-dashed rounded-xl
            flex flex-col items-center gap-2.5 py-10 px-6 mb-4
            cursor-pointer transition-all duration-150
            ${dragging ? "border-gray-400 bg-gray-50" : "border-gray-300 bg-white hover:bg-gray-50"}
          `}
        >
          <svg className="w-7 h-7 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-sm text-gray-500">Click to upload or drag and drop</span>
          <input
            ref={inputRef}
            id="photo-input"
            name="photo-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* Optional caption */}
        <div className="w-full max-w-md mb-6">
          <label
            htmlFor="caption-input"
            className="text-sm font-medium text-gray-700 mb-1.5 block"
          >
            Caption{" "}
            <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            id="caption-input"
            name="caption"
            type="text"
            placeholder="e.g. John's 50th birthday party"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        {/* Photo preview grid */}
        {photos.length > 0 && (
          <div className="w-full max-w-md">
            <p className="text-sm font-medium text-gray-600 mb-3">Uploaded photos</p>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <div className="w-28 h-28 rounded-lg overflow-hidden bg-gray-200">
                    <img
                      src={photo.url}
                      alt={photo.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-white/90 flex items-center justify-center text-red-500 text-xs hover:bg-white transition-colors border border-gray-200"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status message */}
        {status.msg && (
          <p className={`text-sm mt-3 text-center ${status.type === "success" ? "text-green-600" : "text-red-500"}`}>
            {status.msg}
          </p>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={photos.length === 0 || uploading}
          className={`
            mt-8 bg-gray-900 text-white rounded-full px-10 py-3.5 text-sm font-medium
            min-w-[200px] transition-opacity duration-150
            ${photos.length === 0 || uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-black cursor-pointer"}
          `}
        >
          {uploading ? "Uploading..." : "Continue"}
        </button>
      </div>
    </div>
  )
}
