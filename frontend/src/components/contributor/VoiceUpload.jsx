// VoiceUpload.jsx
// Handles audio file uploads for contributors
// Only file upload via click or drag and drop
"use client"

import { useState, useRef } from "react"
import { uploadFiles } from "@/lib/api"

export default function VoiceUpload({ onBack, memorialId, contributorId }) {
  const [recordings, setRecordings] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState({ msg: "", type: "" })
  const [contributorTitle, setContributorTitle] = useState("")
  const [titleError, setTitleError] = useState("")
  const inputRef = useRef()

  const addAudioFile = (file) => {
    setRecordings((prev) => [
      ...prev,
      {
        file,
        name: file.name,
        url:  URL.createObjectURL(file),
        id:   crypto.randomUUID(),
      },
    ])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith("audio/"))
      .forEach((f) => addAudioFile(f))
  }

  const removeRecording = (id) =>
    setRecordings((prev) => prev.filter((r) => r.id !== id))

  const handleUpload = async () => {
    if (recordings.length === 0) return

    // contributor_title is required by the official schema
    if (!contributorTitle.trim()) {
      setTitleError("Please enter a title for your recording")
      return
    }

    setTitleError("")
    setUploading(true)
    setStatus({ msg: "", type: "" })

    try {
      const data = await uploadFiles(
        recordings.map((r) => r.file),
        "voice",
        memorialId,
        contributorId,
        contributorTitle.trim()
      )
      const success = data.uploads.filter((u) => u.status === "success").length
      setStatus({
        msg:  `${success} of ${data.uploads.length} recordings uploaded successfully`,
        type: "success",
      })
      if (success === data.uploads.length) {
        setRecordings([])
        setContributorTitle("")
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
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
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
        <p className="text-sm text-gray-400 mb-8 text-center">
          Upload a voice memo below.
        </p>

        {/* Recording title — required by official schema */}
        <div className="w-full max-w-lg mb-6">
          <label
            htmlFor="recording-title"
            className="text-sm font-medium text-gray-700 mb-1.5 block"
          >
            Recording title <span className="text-red-500">*</span>
          </label>
          <input
            id="recording-title"
            name="recording-title"
            type="text"
            placeholder="e.g. My favourite memory of John"
            value={contributorTitle}
            onChange={(e) => {
              setContributorTitle(e.target.value)
              if (titleError) setTitleError("")
            }}
            className={`
              w-full border rounded-lg px-4 py-2.5 text-sm text-gray-800
              placeholder-gray-400 focus:outline-none transition-colors
              ${titleError
                ? "border-red-400 focus:border-red-400"
                : "border-gray-200 focus:border-gray-400"
              }
            `}
          />
          {titleError && (
            <p className="text-xs text-red-500 mt-1">{titleError}</p>
          )}
        </div>

        {/* Upload drop zone */}
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`
            w-full max-w-lg border-2 border-dashed rounded-xl flex flex-col
            items-center justify-center gap-3 py-14 px-4 mb-6
            cursor-pointer transition-all duration-150
            ${dragging ? "border-gray-400 bg-gray-50" : "border-gray-300 bg-white hover:bg-gray-50"}
          `}
        >
          <svg
            className="w-8 h-8 text-gray-500"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-sm text-gray-500">Click to upload or drag and drop</span>
          <span className="text-xs text-gray-400">MP3, WAV, M4A, WebM up to 50MB</span>
          <input
            ref={inputRef}
            id="audio-input"
            name="audio-input"
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => Array.from(e.target.files).forEach((f) => addAudioFile(f))}
          />
        </div>

        {/* Audio list */}
        {recordings.length > 0 && (
          <div className="w-full max-w-lg">
            <p className="text-sm font-medium text-gray-600 mb-3">Uploaded audio</p>
            <div className="flex flex-col gap-2.5">
              {recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100"
                >
                  <audio controls src={rec.url} className="flex-1 h-8" />
                  <span className="text-xs text-gray-400 truncate max-w-[100px]">
                    {rec.name}
                  </span>
                  <button
                    onClick={() => removeRecording(rec.id)}
                    className="text-red-400 hover:text-red-600 text-xs px-1 transition-colors"
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
          disabled={recordings.length === 0 || uploading}
          className={`
            mt-8 bg-gray-900 text-white rounded-full px-10 py-3.5 text-sm font-medium
            min-w-[200px] transition-opacity duration-150
            ${recordings.length === 0 || uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-black cursor-pointer"}
          `}
        >
          {uploading ? "Uploading..." : "Continue"}
        </button>
      </div>
    </div>
  )
}
