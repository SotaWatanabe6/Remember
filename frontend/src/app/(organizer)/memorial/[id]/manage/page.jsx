// frontend/src/app/(organizer)/memorial/[id]/manage/page.jsx

'use client';

import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Share2, Settings } from 'lucide-react';
import { generateMemorialOutput, getGenerationJobStatus, getMemorialOutput } from '@/services/memorialService';
import { getMemorialContributors } from '@/services/contributorService';
import { getMemorial, createInviteLink, createShareLink } from '@/lib/api';
import { copyTextToClipboard, normalizeShareUrl } from '@/lib/copyToClipboard';
import ConstellationGraph from "@/components/output/constellation";
import MemorialContributionApproval from "@/components/output/contribution-awaiting";
import StorySlideshow from "@/components/output/StorySlideshow";
import VoicesTab from "@/components/output/VoicesTab";
import ProcessingTextSequence from "@/components/dashboard/ProcessingTextSequence";
import { getAuthToken } from "@/lib/api.js";
import Header2 from "@/components/ui-components/navs/header2";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── Generation constants ─────────────────────────────────────────────────────

const GENERATION_POLL_INTERVAL_MS = 1500;
const GENERATION_MAX_POLL_ATTEMPTS = 60;
const OUTPUT_PENDING_POLL_INTERVAL_MS = 5000;
const GENERATION_SUCCESS_STATUSES = new Set(["complete", "completed", "succeeded", "success"]);
const GENERATION_FAILURE_STATUSES = new Set(["failed", "error"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeMemorialForView(memorial) {
  if (!memorial) return null;
  return {
    id: memorial.id,
    subject_name: memorial.subject_name || memorial.deceased_name,
    cover_photo_url: memorial.cover_photo_url || memorial.profile_photo_url || null,
    date_of_birth: memorial.date_of_birth || memorial.birth_date || null,
    date_of_passing: memorial.date_of_passing || memorial.death_date || null,
    bio: memorial.brief_biography || memorial.short_description || memorial.biography || null,
    status: memorial.status || null,
  };
}

function isGeneratingMemorial(memorial) {
  return String(memorial?.status || "").toLowerCase() === "generating";
}

function getManageStatus(status) {
  const key = String(status || "").toLowerCase();
  if (key === "complete") return { label: "Memorial published", className: "bg-[#DCE3C6] text-[#5C6549]" };
  if (key === "collecting" || key === "generating") return { label: "Collecting memories", className: "bg-[#CFE1EE] text-[#526776]" };
  return { label: "Not started", className: "bg-[#EFCFC2] text-[#755A55]" };
}

function isDisplayImage(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function PrevArrow({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="transition-opacity hover:opacity-70 disabled:opacity-30"
      aria-label="Previous page"
    >
      <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.83906 26.4813L15.6245 38.2667L18.5703 35.3208L8.25781 25.0083L18.5703 14.6958L15.6245 11.75L3.83906 23.5354C3.4485 23.9261 3.22909 24.4559 3.22909 25.0083C3.22909 25.5608 3.4485 26.0906 3.83906 26.4813Z"
          fill="#423F39"
        />
      </svg>
    </button>
  );
}

function NextArrow({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="transition-opacity hover:opacity-70 disabled:opacity-30"
      aria-label="Next page"
    >
      <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.1609 26.4813L9.37552 38.2667L6.42969 35.3208L16.7422 25.0083L6.42969 14.6958L9.37552 11.75L21.1609 23.5354C21.5515 23.9261 21.7709 24.4559 21.7709 25.0083C21.7709 25.5608 21.5515 26.0906 21.1609 26.4813Z"
          fill="#423F39"
        />
      </svg>
    </button>
  );
}

function FilterSelect({ value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-[12.7px] border border-r-border bg-transparent px-5 py-4 pr-12 text-xl font-medium text-r-text focus:outline-none"
        style={{ fontFamily: "var(--font-family-display)" }}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M15 30L2.00962 7.5L27.9904 7.5L15 30Z" fill="#423F39" />
        </svg>
      </span>
    </div>
  );
}

// ─── Memorial Header ──────────────────────────────────────────────────────────

function MemorialHeader({ memorial, onShare }) {
  const status = getManageStatus(memorial?.status);
  const birthYear = memorial?.date_of_birth ? new Date(memorial.date_of_birth).getFullYear() : "";
  const passingYear = memorial?.date_of_passing ? new Date(memorial.date_of_passing).getFullYear() : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr_260px] lg:items-center">
      <div className="flex justify-center lg:justify-start">
        <div className="size-[220px] overflow-hidden rounded-full bg-[#F3EBE3]">
          {isDisplayImage(memorial?.cover_photo_url) ? (
            <img
              src={memorial.cover_photo_url}
              alt={memorial?.subject_name || "Memorial portrait"}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      </div>
      <div className="min-w-0 text-center lg:text-left">
        <h1 className="font-family-display text-[36px] font-medium italic leading-[36px] tracking-[0px] text-r-text">
          {memorial?.subject_name || ''}
        </h1>
        <p className="mt-4 font-family-body text-[16px] leading-[16px] tracking-[0px] text-[#5F5A52]">
          {birthYear}
          {birthYear && passingYear ? " - " : ""}
          {passingYear}
        </p>
        <p className="mt-6 max-w-[520px] font-family-body text-[20px] leading-[20px] tracking-[0px] text-[#5F5A52]">
          {memorial?.bio || ''}
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <Link href={memorial?.id ? `/memorial/${memorial.id}/manage/contributions` : '#'}
            className="rounded-full bg-r-btn px-6 py-5 text-center font-family-body text-[18px] leading-[20px] text-r-btn-text transition hover:brightness-95">
            Upload Memories
          </Link>
          <Link href={memorial?.id ? `/memorial/${memorial.id}/output` : '#'}
            className="rounded-full bg-r-btn px-6 py-5 text-center font-family-body text-[18px] leading-[20px] text-r-btn-text transition hover:brightness-95">
            View Memorial
          </Link>
        </div>
        <div className="flex items-center justify-center gap-10 text-r-text lg:justify-end">
          <button type="button" onClick={onShare} className="transition hover:opacity-70" aria-label="Share memorial">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77l-7.13-4.16a3.27 3.27 0 000-1.38l7.12-4.15A2.99 2.99 0 0018 7.91a3 3 0 10-2.83-4 3 3 0 00.12 1.49L8.17 9.56a3 3 0 100 4.88l7.12 4.16c-.08.23-.12.47-.12.72a3 3 0 103-3.24z"/></svg>
          </button>
          <button type="button" className="transition hover:opacity-70" aria-label="Memorial settings">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.03 7.03 0 00-1.63-.94l-.36-2.54a.49.49 0 00-.49-.42h-3.84a.49.49 0 00-.49.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.54 8.84a.5.5 0 00.12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.49.42h3.84c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const MAIN_TABS = ['Archive', 'Contributions', 'Outputs'];

function TabBar({ active, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {MAIN_TABS.map((tab) => (
        <button key={tab} onClick={() => onChange(tab)}
          className={`border-b pb-3 text-center font-family-display text-[24px] font-medium leading-[24px] tracking-[0px] transition-colors ${
            active === tab
              ? 'border-r-text text-r-text'
              : 'border-r-border text-[#6E665D] hover:text-r-text'
          }`}>
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 py-3 text-left">
        <span className="text-base font-medium text-r-text">{title}</span>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"
          className={`text-r-text transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  );
}

// ─── Tab state helpers ────────────────────────────────────────────────────────

function TabLoading() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-r-border border-t-r-text" />
    </div>
  );
}

function TabEmpty({ title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-r-card flex items-center justify-center mb-4" />
      <p className="text-r-text text-base font-medium">{title}</p>
      <p className="text-r-secondary text-sm mt-1 max-w-xs">{message}</p>
    </div>
  );
}

function TabError({ title, message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-red-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-r-text text-base font-medium">{title}</p>
      <p className="text-r-secondary text-sm mt-1 max-w-xs">{message}</p>
      <button onClick={onRetry}
        className="mt-4 rounded-full bg-r-btn px-6 py-2.5 text-sm font-medium text-r-btn-text hover:opacity-85 transition-opacity">
        Try again
      </button>
    </div>
  );
}

// ─── Archive Tab ──────────────────────────────────────────────────────────────

function ArchiveTab({ contributors, output }) {
  const [query, setQuery] = useState('');

  const allPhotos = [];
  const albums = Array.isArray(output?.photos)
    ? output.photos
    : output?.photos?.albums ?? [];
  albums.forEach((album) => {
    (album.photos || []).forEach((p) => allPhotos.push({ type: 'photo', ...p }));
  });

  const allVoices = (output?.voices || []).map((v) => ({ type: 'voice', ...v }));
  const allItems = [...allPhotos, ...allVoices];

  const filtered = query.trim()
    ? allItems.filter((item) => {
        const text = [
          item.caption,
          item.contributor_name,
          item.contributor_title,
          item.key_quote,
          item.transcript_text,
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(query.toLowerCase());
      })
    : allItems;

  return (
    <div className="flex flex-col gap-10 pt-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[56px_1fr_236px_236px]">
        <div className="flex items-center justify-center text-r-text">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.84 5.66H20l-4.99 3.62 1.91 5.88L12 13.54 7.08 17.16l1.91-5.88L4 7.66h6.16L12 2z"/></svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Show me happy memories"
          className="h-[72px] rounded-[18px] border border-r-border bg-[#F6EFE7] px-6 font-family-body text-[20px] leading-[20px] text-[#5F5A52] placeholder:text-[#5F5A52] focus:outline-none focus:ring-2 focus:ring-r-border/30"
        />
        <button type="button" className="flex h-[72px] items-center justify-between rounded-[18px] border border-r-border bg-[#F6EFE7] px-6 font-family-display text-[24px] leading-[24px] text-r-text">
          <span>Filter</span>
          <span className="size-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#4A4742]" />
        </button>
        <button type="button" className="flex h-[72px] items-center justify-between rounded-[18px] border border-r-border bg-[#F6EFE7] px-6 font-family-display text-[24px] leading-[24px] text-r-text">
          <span>Sort</span>
          <span className="size-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#4A4742]" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-r-text text-base font-medium">
            {allItems.length === 0 ? 'No contributions yet' : 'No results found'}
          </p>
          <p className="text-r-secondary text-sm mt-1 max-w-xs">
            {allItems.length === 0
              ? 'Submitted contributions will appear here once generated.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <div key={item.id || i} className="group rounded-xl overflow-hidden border border-neutral-200 bg-white">
              {item.type === 'photo' && (
                item.url
                  ? <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img src={item.url} alt={item.caption || ''} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 px-8 text-center opacity-0 transition-all duration-300 group-hover:bg-black/38 group-hover:opacity-100">
                        <p className="font-family-display text-[30px] leading-[34px] text-white">
                          {item.caption || "Photo title"}
                        </p>
                        <p className="mt-4 font-family-body text-[16px] leading-[16px] text-white">
                          {item.contributor_name ? `Submitted by ${item.contributor_name}` : "Submitted by contributor"}
                        </p>
                        <p className="mt-4 font-family-body text-[16px] leading-[16px] text-white">
                          {item.taken_at
                            ? new Date(item.taken_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : "Date here"}
                        </p>
                      </div>
                    </div>
                  : <div className="aspect-[4/3] w-full bg-neutral-200 flex items-center justify-center">
                      <span className="text-xs text-neutral-400">{item.contributor_name || 'Photo'}</span>
                    </div>
              )}
              {item.type === 'voice' && (
                <div className="aspect-[4/3] w-full bg-r-card flex flex-col items-center justify-center gap-2 p-4">
                  <p className="text-sm font-medium text-r-text text-center">{item.contributor_title}</p>
                  <div className="flex items-center gap-[2px]">
                    {Array.from({ length: 20 }).map((_, j) => (
                      <div key={j} className="w-[2px] rounded-full bg-r-muted"
                        style={{ height: `${8 + ((j * 5) % 16)}px` }} />
                    ))}
                  </div>
                  {item.contributor_name && (
                    <p className="text-xs text-r-secondary">Submitted by {item.contributor_name}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Contributions Tab ────────────────────────────────────────────────────────

function ContributionsTab({ contributorslist, loading, error, onRetry }) {
  const [value, setValue] = useState("contributors");
  const [searchQuery, setSearchQuery] = useState("");
  const [contributorFilter, setContributorFilter] = useState("all");
  const [contributorSort, setContributorSort] = useState("recent");

  const submissions = contributorslist.filter((c) => {
    const status = String(c.status || "").toLowerCase();
    return status === "submitted" || Boolean(c.submitted_at);
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const current = submissions[currentIndex];
  const handlePrev = () => setCurrentIndex((prev) => prev === 0 ? submissions.length - 1 : prev - 1);
  const handleNext = () => setCurrentIndex((prev) => prev === submissions.length - 1 ? 0 : prev + 1);
  const contributorCards = [...contributorslist]
    .filter((contributor) => {
      if (contributorFilter === "anonymous") {
        return String(contributor.name || "").trim().toLowerCase() === "anonymous";
      }
      if (contributorFilter === "named") {
        return String(contributor.name || "").trim().toLowerCase() !== "anonymous";
      }
      return true;
    })
    .sort((a, b) => {
      if (contributorSort === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }
      return new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0);
    });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-6">
          <div className="relative w-[450px]">
            <select
              onChange={(e) => setValue(e.target.value)}
              value={value}
              className="h-[63px] w-full appearance-none rounded-[22px] border border-r-border bg-[#F6EFE7] px-7 pr-20 font-family-display text-[24px] leading-[24px] text-r-text outline-none"
            >
              <option value="contributors">Contributors</option>
              <option value="awaiting">Awaiting approval</option>
            </select>
            <span className="pointer-events-none absolute right-7 top-1/2 size-0 -translate-y-1/2 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#4A4742]" />
          </div>
          {value === "contributors" && (
            <div className="flex items-center gap-5">
              <div className="relative w-[213px]">
                <select
                  value={contributorFilter}
                  onChange={(e) => setContributorFilter(e.target.value)}
                  className="h-[63px] w-full appearance-none rounded-[18px] border border-r-border bg-[#F6EFE7] px-5 pr-16 font-family-display text-[24px] leading-[24px] text-r-text outline-none"
                >
                  <option value="all">Filter</option>
                  <option value="anonymous">Anonymous</option>
                  <option value="named">Named</option>
                </select>
                <span className="pointer-events-none absolute right-5 top-1/2 size-0 -translate-y-1/2 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#4A4742]" />
              </div>
              <div className="relative w-[213px]">
                <select
                  value={contributorSort}
                  onChange={(e) => setContributorSort(e.target.value)}
                  className="h-[63px] w-full appearance-none rounded-[18px] border border-r-border bg-[#F6EFE7] px-5 pr-16 font-family-display text-[24px] leading-[24px] text-r-text outline-none"
                >
                  <option value="recent">Sort</option>
                  <option value="recent">Most recent</option>
                  <option value="name">Name</option>
                </select>
                <span className="pointer-events-none absolute right-5 top-1/2 size-0 -translate-y-1/2 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#4A4742]" />
              </div>
            </div>
          )}
        </div>
        {(value === "awaiting" && submissions.length > 0) && (
          <div className="flex items-center justify-between gap-6">
            <div className="flex h-[63px] w-full max-w-[434px] items-center rounded-full border border-r-border bg-[#F6EFE7] px-6">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#4A4742]">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a contributor"
                className="ml-6 w-full bg-transparent font-family-body text-[20px] leading-[20px] text-[#5F5A52] placeholder:text-[#5F5A52] outline-none"
              />
            </div>
            <div className="flex items-center gap-12 px-6 font-family-display text-[24px] leading-[24px] text-r-text">
              <button onClick={handlePrev} className="transition hover:opacity-70">
                <ChevronLeft size={54} strokeWidth={1.8} />
              </button>
              <span>1/5</span>
              <button onClick={handleNext} className="transition hover:opacity-70">
                <ChevronRight size={54} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
      </div>

      {value === "contributors" && loading && <TabLoading />}
      {value === "contributors" && !loading && error && (
        <TabError
          title="Unable to load contributors"
          message="Contributor details could not be loaded. You can still use the other tabs."
          onRetry={onRetry}
        />
      )}
      {value === "contributors" && !loading && !error && contributorslist.length === 0 && (
        <TabEmpty
          title="No contributors yet"
          message="Contributors will appear here once people begin sharing memories."
        />
      )}
      {value === "contributors" && !loading && !error && contributorslist.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {contributorCards.map((contributor) => (
            <article
              key={contributor.id}
              className="min-h-[287px] rounded-[18px] border border-r-border bg-[#F6EFE7] px-[50px] py-12"
            >
              <h3 className="font-family-display text-[28px] leading-[32px] text-r-text">
                {contributor.name || "Anonymous"}
              </h3>
              <p className="mt-6 font-family-body text-[16px] leading-[20px] text-[#5F5A52]">
                {contributor.contribution_count || 0} contributions
              </p>
              <p className="mt-4 font-family-body text-[16px] leading-[20px] text-[#5F5A52]">
                Last submitted {contributor.submitted_at
                  ? new Date(contributor.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'May 20, 2026'}
              </p>
              <span className="mt-6 inline-flex min-h-[49px] min-w-[214px] items-center justify-center rounded-[14px] bg-[#B9C493] px-6 font-family-body text-[16px] leading-[20px] text-[#5C6549]">
                {contributor.relationship_type || 'Relationship'}
              </span>
            </article>
          ))}
          {contributorCards.length === 0 && (
            <div className="col-span-full py-12 text-center font-family-body text-[18px] text-[#5F5A52]">
              No contributors match the current filter.
            </div>
          )}
        </div>
      )}
      {value === "awaiting" && (
        <MemorialContributionApproval contributors={current} gallery={submissions.length} />
      )}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ photo, onClose, onPrev, onNext }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full max-h-[80vh] overflow-hidden rounded-2xl bg-neutral-900 flex items-center justify-center">
          {photo.url
            ? <img src={photo.url} alt={photo.caption || ''} className="max-h-[80vh] w-auto max-w-full object-contain" />
            : <div className="h-64 w-full bg-neutral-700 flex items-center justify-center"><span className="text-neutral-500 text-sm">No image</span></div>}
        </div>
        <div className="mt-3 px-1">
          {photo.caption && <p className="text-white text-sm font-medium">{photo.caption}</p>}
          <p className="text-neutral-400 text-xs mt-0.5">
            {photo.contributor_name}{photo.taken_at && ` · ${new Date(photo.taken_at).getFullYear()}`}
          </p>
        </div>
        <button onClick={onPrev} className="absolute left-[-48px] top-1/2 -translate-y-1/2 p-2 text-white hover:text-neutral-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={onNext} className="absolute right-[-48px] top-1/2 -translate-y-1/2 p-2 text-white hover:text-neutral-300">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button onClick={onClose} className="absolute -top-10 right-0 p-2 text-white hover:text-neutral-300">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
// ─── All Photos Section ───────────────────────────────────────────────────────

function ConstellationSection({output, memorial,contributors, onGenerate, generating, canGenerate }) {
  const [page, setPage] = useState(1);
  const totalPages = 2;
  return (
    <div>      
      <div className="rounded-2xl border border-neutral-100 bg-r-bg py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          {/* <select
            value={tab}
            onChange={handleChange}
            className="border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm outline-none"
          >
            <option value="Themes">
              Constellation : Themes
            </option>

            <option value="Relationships">
              Constellation : Relationships
            </option>
          </select> */}
          <h2 className="text-[36px] mt-6 font-medium italic text-neutral-950" style={{ fontFamily: 'var(--font-boska, serif)' }}>
            Constellation
          </h2>        
          <div className="flex items-center gap-4">
            <button
              onClick={onGenerate}
              disabled={!canGenerate || generating}
              className="rounded-full px-6 py-[14px] text-base text-neutral-950 transition-opacity hover:opacity-80 disabled:opacity-45 disabled:cursor-not-allowed border-none"
              style={{ backgroundColor: 'var(--color-r-btn)' }}
            >
              {generating ? 'Generating…' : 'Generate'}
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="transition-opacity hover:opacity-70 disabled:opacity-30"
                aria-label="Previous page"
              >
                <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M3.83906 26.4813L15.6245 38.2667L18.5703 35.3208L8.25781 25.0083L18.5703 14.6958L15.6245 11.75L3.83906 23.5354C3.4485 23.9261 3.22909 24.4559 3.22909 25.0083C3.22909 25.5608 3.4485 26.0906 3.83906 26.4813Z"
                    fill="#423F39"/>
                </svg>
              </button>
              <span className="text-2xl font-medium text-neutral-950 min-w-[48px] text-center"
                style={{ fontFamily: 'var(--font-boska, serif)' }}>
                {page} {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="transition-opacity hover:opacity-70 disabled:opacity-30"
                aria-label="Next page"
              >
                <svg width="25" height="50" viewBox="0 0 25 50" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd"
                    d="M21.1609 26.4813L9.37552 38.2667L6.42969 35.3208L16.7422 25.0083L6.42969 14.6958L9.37552 11.75L21.1609 23.5354C21.5515 23.9261 21.7709 24.4559 21.7709 25.0083C21.7709 25.5608 21.5515 26.0906 21.1609 26.4813Z"
                    fill="#423F39"/>
                </svg>
              </button>
            </div>
          </div>            
        </div>       
      </div>
      <ConstellationGraph
        ai_output={output}
        memorial={memorial}
        contributor={contributors}
        page={page}
        width={800}
        height={800}
      />
    </div>
  );
}



// ─── All Photos Section ───────────────────────────────────────────────────────

function AllPhotosSection({ albums, onGenerate, generating, canGenerate }) {
  const PHOTOS_PER_PAGE = 6;
  const [filterView, setFilterView] = useState('all'); // 'all' | 'albums'
  const [sortOrder, setSortOrder] = useState('recently_added');
  const [page, setPage] = useState(1);
  const [openAlbum, setOpenAlbum] = useState(null); // album object when drilling into an album
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Normalize both backend shapes:
  // Real: { albums: [{ name, photos, cover_photo_url, photo_count }] }
  // Mock: [{ album_name, photos, cover_photo_url }]
  const albumList = (() => {
    if (!albums) return [];
    if (albums.albums && Array.isArray(albums.albums)) {
      return albums.albums.map((a) => ({
        album_name: a.name || a.album_name || 'Album',
        cover_photo_url: a.cover_photo_url || a.photos?.[0]?.url || null,
        photo_count: a.photo_count ?? a.photos?.length ?? 0,
        photos: (a.photos || []).map((p) => ({
          id: p.id,
          url: p.url || null,
          caption: p.caption || null,
          taken_at: p.taken_at || null,
          contributor_name: p.contributor_name || null,
        })),
      }));
    }
    if (Array.isArray(albums)) {
      return albums.map((a) => ({
        album_name: a.album_name || a.name || 'Album',
        cover_photo_url: a.cover_photo_url || a.photos?.[0]?.url || null,
        photo_count: a.photo_count ?? a.photos?.length ?? 0,
        photos: a.photos || [],
      }));
    }
    return [];
  })();

  const allPhotos = albumList.flatMap((album) =>
    (album.photos || []).map((p) => ({ ...p, album_name: album.album_name }))
  );

  const isAlbumView = filterView === 'albums';

  // When a filter view changes, reset album drill-in and page
  function handleFilterChange(val) {
    setFilterView(val);
    setOpenAlbum(null);
    setPage(1);
    // Reset sort to a valid option for the new view
    setSortOrder('recently_added');
  }

  function handleAlbumClick(album) {
    setOpenAlbum(album);
    setPage(1);
  }

  function handleBackToAlbums() {
    setOpenAlbum(null);
    setPage(1);
  }

  // Sort the photos being displayed
  function sortPhotos(photos) {
    return [...photos].sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.taken_at || a.created_at || 0) - new Date(b.taken_at || b.created_at || 0);
      }
      if (sortOrder === 'name') {
        return (a.caption || '').localeCompare(b.caption || '');
      }
      // recently_added (default)
      return new Date(b.taken_at || b.created_at || 0) - new Date(a.taken_at || a.created_at || 0);
    });
  }

  function sortAlbums(list) {
    return [...list].sort((a, b) => {
      if (sortOrder === 'name') {
        return (a.album_name || '').localeCompare(b.album_name || '');
      }
      // recently_added — albums don't have dates so keep original order
      return 0;
    });
  }

  // Determine what to paginate
  let itemsForPagination = [];
  if (openAlbum) {
    itemsForPagination = sortPhotos(openAlbum.photos || []);
  } else if (isAlbumView) {
    itemsForPagination = sortAlbums(albumList);
  } else {
    itemsForPagination = sortPhotos(allPhotos);
  }

  const totalPages = Math.max(1, Math.ceil(itemsForPagination.length / PHOTOS_PER_PAGE));
  const paginatedItems = itemsForPagination.slice((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE);

  function openLightbox(photo, index) { setLightboxPhoto(photo); setLightboxIndex(index); }
  function prevPhoto() {
    const i = (lightboxIndex - 1 + paginatedItems.length) % paginatedItems.length;
    setLightboxIndex(i); setLightboxPhoto(paginatedItems[i]);
  }
  function nextPhoto() {
    const i = (lightboxIndex + 1) % paginatedItems.length;
    setLightboxIndex(i); setLightboxPhoto(paginatedItems[i]);
  }

  // Sort options differ by view
  const sortOptions = (isAlbumView && !openAlbum)
    ? [
        { value: 'recently_added', label: 'Recently added' },
        { value: 'name', label: 'Name' },
      ]
    : [
        { value: 'recently_added', label: 'Recently added' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'name', label: 'Name' },
      ];

  return (
    <div className="flex flex-col gap-5 pt-4">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {openAlbum && (
            <button
              onClick={handleBackToAlbums}
              className="flex items-center gap-1.5 text-r-secondary text-sm hover:text-r-text transition-colors"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Albums
            </button>
          )}
          <h2
            className="text-[36px] font-medium italic text-r-text"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            {openAlbum ? openAlbum.album_name : 'All photos'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || generating}
            className="rounded-full px-6 py-[14px] text-base text-r-btn-text transition-opacity hover:opacity-80 disabled:opacity-45 disabled:cursor-not-allowed border-none"
            style={{ backgroundColor: 'var(--color-r-btn)' }}
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
          <div className="flex items-center gap-3">
            <PrevArrow onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} />
            <span
              className="text-2xl font-medium text-r-text min-w-[64px] text-center"
              style={{ fontFamily: 'var(--font-family-display)' }}
            >
              {page} / {totalPages}
            </span>
            <NextArrow onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
          </div>
        </div>
      </div>

      {/* Filter + Sort — hide filter when inside an album */}
      {!openAlbum && (
        <div className="flex items-center justify-between gap-4">
          <FilterSelect
            value={filterView}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="flex-1 max-w-[434px]"
          >
            <option value="all">All photos</option>
            <option value="albums">Albums</option>
          </FilterSelect>

          <FilterSelect
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            className="w-[207px]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </FilterSelect>
        </div>
      )}

      {/* Inside an open album: sort only */}
      {openAlbum && (
        <div className="flex justify-end">
          <FilterSelect
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            className="w-[207px]"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </FilterSelect>
        </div>
      )}

      {/* Albums grid */}
      {isAlbumView && !openAlbum && (
        albumList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-medium text-r-text">No albums yet</p>
            <p className="text-sm text-r-secondary mt-1 max-w-xs">
              AI-named albums are created after Generate runs.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {paginatedItems.map((album, index) => (
              <button
                key={album.album_name || index}
                onClick={() => handleAlbumClick(album)}
                className="group relative rounded-2xl overflow-hidden border border-r-border bg-r-card text-left cursor-pointer hover:opacity-90 transition-opacity"
                style={{ aspectRatio: '4/3' }}
              >
                {album.cover_photo_url ? (
                  <img
                    src={album.cover_photo_url}
                    alt={album.album_name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-r-card" />
                )}
                <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-4">
                  <p
                    className="text-white text-sm font-medium truncate"
                    style={{ fontFamily: 'var(--font-family-display)' }}
                  >
                    {album.album_name}
                  </p>
                  <p className="text-white/70 text-xs mt-0.5">
                    {album.photo_count || album.photos?.length || 0} photos
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* Photo grid — shown for "All photos" view OR when inside an album */}
      {(!isAlbumView || openAlbum) && (
        paginatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base font-medium text-r-text">
              {openAlbum ? 'No photos in this album' : 'No photos yet'}
            </p>
            <p className="text-sm text-r-secondary mt-1 max-w-xs">
              {openAlbum
                ? 'This album has no photos assigned yet.'
                : 'Photos will appear here once contributors have submitted and the memorial has been generated.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {paginatedItems.map((photo, index) => (
              <button
                key={photo.id || index}
                onClick={() => openLightbox(photo, index)}
                className="group relative w-full overflow-hidden rounded-2xl bg-r-card"
                style={{ aspectRatio: '4/3' }}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption || ''}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full bg-r-card" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 flex items-end p-3 opacity-0 group-hover:opacity-100">
                  <div className="w-full">
                    {photo.caption && <p className="text-white text-xs font-semibold truncate">{photo.caption}</p>}
                    {photo.contributor_name && <p className="text-white text-xs truncate">{photo.contributor_name}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </div>
  );
}


// ─── Pre-generation empty state ───────────────────────────────────────────────


function PreGenerationEmpty({ canGenerate, disabledMessage, generationError, generationJob, generating, onGenerate }) {
  const isPending = generating && !generationError;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-r-card flex items-center justify-center mb-4">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-r-muted">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <p className="text-r-text text-base font-medium">
        {isPending ? "Generation is in progress" : "Generation hasn't run yet"}
      </p>
      <p className="text-r-secondary text-sm mt-1 max-w-xs leading-relaxed">
        {isPending
          ? "Outputs will appear here automatically once the memorial is ready."
          : "Once you have contributions, click Generate to create the Story, Constellation, Voices, and Photos."}
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || generating}
        className="mt-6 flex h-[50px] w-[207px] items-center justify-center rounded-full px-6 text-sm font-medium text-r-btn-text transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45 border-none"
        style={{ backgroundColor: 'var(--color-r-btn)' }}
      >
        {generating ? "Generating..." : "Generate"}
      </button>
      {isPending && (
        <div className="mt-4 w-full max-w-xs" aria-live="polite">
          <div className="h-1.5 overflow-hidden rounded-full bg-r-card">
            <div className="h-full rounded-full bg-r-text transition-all duration-300"
              style={{ width: `${Math.max(10, generationJob?.progress ?? 10)}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-r-secondary">
            {generationJob?.current_step || "Preparing generation..."}
          </p>
          <ProcessingTextSequence />
        </div>
      )}
      {!generating && disabledMessage && (
        <p className="mt-3 max-w-xs text-xs text-r-secondary">{disabledMessage}</p>
      )}
      {generationError && (
        <p className="mt-3 max-w-xs text-sm text-r-danger" role="alert">{generationError}</p>
      )}
    </div>
  );
}

// ─── Outputs Tab ──────────────────────────────────────────────────────────────

function OutputsTab({ memorial, contributors, canGenerate, disabledMessage, generationError, generationJob, generating, onGenerate, output, loading, error, onRetry }) {
  if (loading) return <TabLoading />;

  if (error) {
    return (
      <TabError
        title="Unable to load outputs"
        message="The generated memorial output could not be loaded. Archive and Contributions are still available."
        onRetry={onRetry}
      />
    );
  }

  if (!output) {
    return (
      <div className="pt-6">
        <PreGenerationEmpty
          canGenerate={canGenerate}
          disabledMessage={disabledMessage}
          generationError={generationError}
          generationJob={generationJob}
          generating={generating}
          onGenerate={onGenerate}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-r-border pt-4">
      <CollapsibleSection title="Story">
        <StorySlideshow output={output} story={output?.story} />
      </CollapsibleSection>
      <CollapsibleSection title="Constellation">
        <ConstellationSection  
          output={output}
          memorial={memorial}
          contributors={contributors}
          onGenerate={onGenerate}
          generating={generating}
          canGenerate={canGenerate}        
        />
      </CollapsibleSection>
      <CollapsibleSection title="Voices">
        <VoicesTab output={output} voices={output?.voices} />
      </CollapsibleSection>
      <div className="pt-2 border-t border-r-border">
        <AllPhotosSection
          albums={output?.photos}
          onGenerate={onGenerate}
          generating={generating}
          canGenerate={canGenerate}
        />
      </div>
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({ onClose, memorialId }) {
  const [contributorUrl, setContributorUrl] = useState('');
  const [viewerUrl, setViewerUrl] = useState('');
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const [copiedContributor, setCopiedContributor] = useState(false);
  const [copiedViewer, setCopiedViewer] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadShareLinks() {
      setLinksLoading(true);
      setLinksError(null);
      setContributorUrl('');
      setViewerUrl('');
      try {
        const invite = await createInviteLink(memorialId);
        if (cancelled) return;
        setContributorUrl(normalizeShareUrl(invite?.invite_link?.url ?? ''));

        try {
          const share = await createShareLink(memorialId);
          if (!cancelled) {
            setViewerUrl(normalizeShareUrl(share?.share_link?.url ?? ''));
          }
        } catch (shareErr) {
          console.warn('Viewer share link unavailable:', shareErr);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Could not load share links.';
          if (message.toLowerCase().includes('not authorized') || message.toLowerCase().includes('do not own')) {
            setLinksError('This memorial is not linked to your account. Go to Dashboard, open a memorial you created, then try Share again.');
          } else if (message.toLowerCase().includes('logged in')) {
            setLinksError(`${message} Sign in and try again.`);
          } else {
            setLinksError(`${message} Close and try again.`);
          }
        }
      } finally {
        if (!cancelled) setLinksLoading(false);
      }
    }

    loadShareLinks();
    return () => { cancelled = true; };
  }, [memorialId]);

  async function copyLink(type) {
    setCopyError(null);
    const url = type === 'contributor' ? contributorUrl : viewerUrl;
    if (!url) { setCopyError('Link is not ready yet.'); return; }
    try {
      await copyTextToClipboard(url);
      if (type === 'contributor') {
        setCopiedContributor(true);
        setTimeout(() => setCopiedContributor(false), 2000);
      } else {
        setCopiedViewer(true);
        setTimeout(() => setCopiedViewer(false), 2000);
      }
    } catch {
      setCopyError('Copy failed. Select the link below and copy manually.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-r-modal p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onClose} className="text-r-text">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-h2 text-r-text">Share</h2>
        </div>
        {linksError && <p className="text-body-2 text-r-danger mb-4">{linksError}</p>}
        {copyError && <p className="text-body-2 text-r-danger mb-4">{copyError}</p>}
        {[
          { label: 'Invite Contributors', sub: 'For friends and family to share their memories:', type: 'contributor', copied: copiedContributor, url: contributorUrl },
          { label: 'Invite Viewers', sub: 'For anyone to view this memorial:', type: 'viewer', copied: copiedViewer, url: viewerUrl },
        ].map(({ label, sub, type, copied, url }) => (
          <div key={type} className="flex items-start justify-between mb-6">
            <div className="min-w-0 pr-4">
              <p className="text-h3 text-r-text">{label}</p>
              <p className="text-body-2 text-r-secondary mt-0.5">{sub}</p>
              {url && <p className="text-caption text-r-secondary mt-2 break-all">{url}</p>}
            </div>
            <button
              type="button"
              onClick={() => copyLink(type)}
              disabled={linksLoading || !url}
              className="shrink-0 rounded-full px-4 py-2 text-h4 transition-all ml-5 border-none disabled:opacity-50"
              style={{ backgroundColor: copied ? '#7D8C6A' : 'var(--color-r-btn)', color: copied ? '#FBF9F6' : 'var(--color-r-btn-text)' }}
            >
              {copied ? 'Copied!' : linksLoading ? 'Loading…' : 'Copy Link'}
            </button>
          </div>
        ))}
        <div className="flex justify-center gap-6 mt-8">
          {['Message', 'Email', 'Instagram'].map((label) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-14 h-12 rounded-xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity bg-r-shape">
                <span className="text-caption font-medium" style={{ color: 'white' }}>{label[0]}</span>
              </div>
              <span className="text-caption text-r-secondary">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemorialOutputPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Outputs');
  const [output, setOutput] = useState(null);
  const [outputLoading, setOutputLoading] = useState(true);
  const [outputError, setOutputError] = useState(null);
  const [contributorsLoading, setContributorsLoading] = useState(true);
  const [contributorsError, setContributorsError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [contributors, setContributors] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generationJob, setGenerationJob] = useState(null);
  const [memorial, setMemorial] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const memorialId = id;

  useEffect(() => {
    if (!id) return;
    getMemorial(id)
      .then((data) => {
        const m = data?.memorial ?? data;
        const normalized = normalizeMemorialForView(m);
        if (!normalized) return;
        setMemorial(normalized);
        setGenerating(isGeneratingMemorial(normalized));
      })
      .catch(() => { setMemorial(null); });

    // Load the invite token so "Upload Memories" can link the organizer
    // straight into the contributor flow as themselves.
    createInviteLink(id)
      .then((res) => {
        const token = res?.invite_link?.token ?? res?.token ?? null;
        setInviteToken(token);
      })
      .catch(() => { /* non-critical — button falls back to manage page */ });
  }, [id]);

  const loadContributors = useCallback(async () => {
    if (!memorialId) return;
    setContributorsLoading(true);
    setContributorsError(null);
    try {
      const token = await getAuthToken();
      const contributor = await getMemorialContributors(memorialId, token);
      const memorialApi = await getMemorial(memorialId);
      const m = memorialApi?.memorial ?? memorialApi;
      const normalized = normalizeMemorialForView(m);
      if (normalized) {
        setMemorial(normalized);
        setGenerating((current) => current || isGeneratingMemorial(normalized));
      }
      setContributors(contributor.contributors ?? []);
    } catch (err) {
      setContributorsError(err instanceof Error ? err.message : "Failed to fetch contributors");
      setContributors([]);
    } finally {
      setContributorsLoading(false);
    }
  }, [memorialId]);

  const loadOutput = useCallback(async (options = {}) => {
    if (!id) return;
    setOutputLoading(true);
    setOutputError(null);
    try {
      const token = await getAuthToken();
      const data = await getMemorialOutput(id, token, options);
      setOutput(data);
      return data;
    } catch (err) {
      setOutputError(err instanceof Error ? err.message : "Failed to fetch memorial output");
      setOutput(null);
      return null;
    } finally {
      setOutputLoading(false);
    }
  }, [id]);

  const handleGenerate = useCallback(async () => {
    if (!memorialId || generating) return;
    setGenerating(true);
    setGenerationError(null);
    setGenerationJob(null);
    const token = await getAuthToken();
    let keepGenerating = false;
    try {
      const generation = await generateMemorialOutput(memorialId, token);
      const initialJob = generation?.job ?? null;
      setGenerationJob(initialJob);

      if (initialJob?.id) {
        let latestJob = initialJob;
        for (let attempt = 0; attempt < GENERATION_MAX_POLL_ATTEMPTS; attempt += 1) {
          const status = String(latestJob?.status || "").toLowerCase();
          if (GENERATION_SUCCESS_STATUSES.has(status)) break;
          if (GENERATION_FAILURE_STATUSES.has(status)) {
            throw new Error(latestJob?.error_message || "Generation failed. Please try again.");
          }
          await sleep(GENERATION_POLL_INTERVAL_MS);
          const jobStatus = await getGenerationJobStatus(initialJob.id, token);
          latestJob = jobStatus?.job ?? latestJob;
          setGenerationJob(latestJob);
        }
        const finalStatus = String(latestJob?.status || "").toLowerCase();
        if (!GENERATION_SUCCESS_STATUSES.has(finalStatus)) {
          keepGenerating = true;
          await loadOutput({ fallbackToMock: process.env.NODE_ENV !== 'production' });
          return;
        }
      }

      await loadOutput({ fallbackToMock: process.env.NODE_ENV !== 'production' });
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      if (!keepGenerating) setGenerating(false);
    }
  }, [generating, loadOutput, memorialId]);

  useEffect(() => {
    if (!id || output || !generating) return undefined;
    let cancelled = false;

    async function pollPendingOutput() {
      const token = await getAuthToken();
      const data = await getMemorialOutput(id, token);
      if (cancelled) return;
      if (data) {
        setOutput(data);
        setOutputError(null);
        setGenerating(false);
        setGenerationJob((job) => job ? { ...job, status: 'complete', progress: 100, current_step: 'Complete' } : job);
        try {
          const memorialApi = await getMemorial(id);
          if (!cancelled) {
            const normalized = normalizeMemorialForView(memorialApi?.memorial ?? memorialApi);
            if (normalized) setMemorial(normalized);
          }
        } catch {
          // Output is loaded; header refresh can wait for next page visit.
        }
      }
    }

    pollPendingOutput();
    const intervalId = window.setInterval(pollPendingOutput, OUTPUT_PENDING_POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, [generating, id, output]);

  const submittedContributionCount = contributors.filter((contributor) => {
    const status = String(contributor?.status || "").toLowerCase();
    return status === "submitted" || Boolean(contributor?.submitted_at);
  }).length;

  const canGenerate = !contributorsLoading && !contributorsError && submittedContributionCount > 0;
  const generationDisabledMessage = contributorsLoading
    ? "Checking submitted contributions..."
    : contributorsError
      ? "Contributor data could not be loaded, so generation is unavailable right now."
      : submittedContributionCount === 0
        ? "Generation is available after at least one contributor submits a memory."
        : "";

  useEffect(() => { queueMicrotask(loadContributors); }, [loadContributors]);
  useEffect(() => { queueMicrotask(loadOutput); }, [loadOutput]);

  return (
    <main className="min-h-screen bg-r-bg px-6 py-8 text-neutral-950 sm:px-[50px] sm:py-[50px]">
      <div className="mx-auto flex w-full flex-col gap-8">
        <Header2 backHref="/dashboard" />

        <MemorialHeader memorial={memorial} onShare={() => setShowShare(true)} />
        <TabBar active={activeTab} onChange={setActiveTab} />

        <div>
          {activeTab === 'Archive' && <ArchiveTab contributors={contributors} output={output} />}
          {activeTab === 'Contributions' && (
            <ContributionsTab
              contributorslist={contributors}
              loading={contributorsLoading}
              error={contributorsError}
              onRetry={loadContributors}
            />
          )}
          {activeTab === 'Outputs' && (
            <OutputsTab
              memorial={memorial}
              contributors={contributors}
              canGenerate={canGenerate}
              disabledMessage={generationDisabledMessage}
              generationError={generationError}
              generationJob={generationJob}
              generating={generating}
              onGenerate={handleGenerate}
              output={output}
              loading={outputLoading}
              error={outputError}
              onRetry={loadOutput}
            />
          )}
        </div>
      </div>

      {showShare && <ShareModal onClose={() => setShowShare(false)} memorialId={id} />}
    </main>
  );
}
