"use client";

import Image from "next/image";
import { ArrowLeft, Sparkles, Play } from "lucide-react";
import { useState } from "react";


export default function ManageMemorialPage() {
  const [activeTab, setActiveTab] = useState("home");
  return (
    <main className="min-h-screen bg-[#f5f5f5] px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-xl font-medium">Remember</h1>

        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-black">
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Hero Section */}
      <section className="flex justify-between gap-10 mb-14">
        {/* Left */}
        <div className="flex gap-10">
          {/* Avatar */}
          <div className="w-[170px] h-[170px] rounded-full bg-slate-600" />

          {/* Info */}
          <div className="pt-5">
            <h2 className="text-4xl font-semibold mb-2">John Smith</h2>

            <p className="text-gray-500 mb-4">1983 - 2026</p>

            <p className="max-w-md text-gray-600 leading-relaxed mb-5">
              This paragraph can be an example of explaining who John is.
              It&apos;s intended to be a part of John&apos;s profile.
            </p>

            <div className="inline-flex items-center rounded-lg bg-gray-200 px-6 py-2 text-sm">
              Status tag
            </div>
          </div>
        </div>

        {/* Right Buttons */}
        <div className="flex flex-col gap-4 pt-4">
          <button className="rounded-full bg-black text-white px-8 py-4 font-medium hover:opacity-90">
            View page
          </button>

          <button className="rounded-full bg-black text-white px-8 py-4 font-medium hover:opacity-90">
            Share
          </button>

          <button className="rounded-full bg-black text-white px-8 py-4 font-medium hover:opacity-90">
            Settings
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          style={{ cursor: "pointer" }}
          className={`border-b-2 pb-2 font-semibold ${activeTab === "home" ? "border-black" : "border-gray-400 text-gray-700"}`}
          onClick={() => setActiveTab("home")}
        >
          Archive
        </button>

        <button
          style={{ cursor: "pointer" }}        
          className={`border-b-2 pb-2 font-semibold ${activeTab === "contributions" ? "border-black" : "border-gray-400 text-gray-700"}`}
          onClick={() => setActiveTab("contributions")}
        >
          Contributions
        </button>

        <button
          style={{ cursor: "pointer" }}        
          className={`border-b-2 pb-2 font-semibold ${activeTab === "outputs" ? "border-black" : "border-gray-400 text-gray-700"}`}
          onClick={() => setActiveTab("outputs")}
        >
          Outputs
        </button>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-4 mb-8">
        {/* Search */}
        <div className="flex flex-1 items-center gap-3 rounded-xl border bg-white px-4 py-3">
          <Sparkles size={18} />

          <input
            type="text"
            placeholder="Show me happy memories"
            className="w-full bg-transparent outline-none placeholder:text-gray-400"
          />
        </div>

        <button 
          style={{ cursor: "pointer" }}        
          className="rounded-full bg-black px-10 py-4 text-white font-medium"
        >
          Filter
        </button>

        <button 
          style={{ cursor: "pointer" }}        
          className="rounded-full bg-black px-10 py-4 text-white font-medium"
        >
          Sort
        </button>
      </div>

      {/* Cards */}
      {activeTab === "home" && 
        <section className="grid grid-cols-3 gap-4">
          {/* Image Card */}
          <div className="overflow-hidden rounded-xl border bg-white">
            <Image
              src="/images/image.png"
              alt="Person"
              width={500}
              height={500}
              className="h-[260px] w-full object-cover"
            />
          </div>

          {/* Audio Card */}
          <div className="flex flex-col items-center justify-center rounded-xl border bg-white p-10 text-center">
            <h3 className="mb-6 text-xl font-medium">
              AI or user title of input
            </h3>

            <div className="flex items-center gap-4">
              <button className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                <Play size={18} fill="white" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-black"
                    style={{
                      height: `${10 + (i % 5) * 6}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Text Card */}
          <div className="flex flex-col items-center justify-center rounded-xl border bg-white p-10 text-center">
            <h3 className="mb-2 text-xl font-medium">
              AI or user title of input
            </h3>

            <p className="text-sm text-gray-500">
              Submitted by Jane Smith
            </p>
          </div>
        </section>
      }
      {activeTab === "outputs" && 
        <section>
          <section className="mt-6">
            <div className="relative w-60">
              <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none">
                <option>Constellation</option>
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                ▼
              </span>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-gray-300 bg-[#f3f4f6] p-6">
            <div className="rounded-xl border border-gray-200 bg-[#d9d9d9] p-4">
              <svg
                viewBox="0 0 1000 420"
                className="h-[360px] w-full rounded-lg"
                preserveAspectRatio="none"
              >
                {/* Lines */}
                <g stroke="#9ca3af" strokeWidth="3" strokeLinecap="round">
                  <line x1="120" y1="140" x2="175" y2="270" />
                  <line x1="180" y1="270" x2="310" y2="165" />
                  <line x1="310" y1="165" x2="420" y2="300" />
                  <line x1="310" y1="165" x2="520" y2="290" />
                  <line x1="520" y1="290" x2="570" y2="130" />
                  <line x1="570" y1="130" x2="760" y2="205" />
                  <line x1="760" y1="205" x2="860" y2="295" />
                </g>

                {/* Nodes */}
                <circle cx="120" cy="140" r="38" fill="#efefef" />
                <circle cx="180" cy="270" r="48" fill="#efefef" />
                <circle cx="310" cy="165" r="62" fill="#efefef" />
                <circle cx="420" cy="300" r="56" fill="#efefef" />
                <circle cx="570" cy="130" r="50" fill="#efefef" />
                <circle cx="760" cy="205" r="78" fill="#efefef" />
                <circle cx="860" cy="295" r="96" fill="#efefef" />
              </svg>
            </div>
          </section>
          
        </section>      
      }
    </main>
  );

}
