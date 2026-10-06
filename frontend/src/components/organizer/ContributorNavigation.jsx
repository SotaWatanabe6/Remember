"use client";

import { useRef } from "react";
import { Search, X } from "lucide-react";

export default function ContributorNavigation({ query, onQueryChange, index, count, onPrevious, onNext }) {
  const inputRef = useRef(null);

  return (
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
      <div className="relative flex h-[63px] w-full max-w-[432px] items-center gap-[50px] rounded-[30px] border border-r-muted px-[30px] focus-within:ring-2 focus-within:ring-r-border-focus">
        <Search size={26} strokeWidth={1.8} className="shrink-0 text-r-text" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onQueryChange("");
          }}
          aria-label="Search contributors by name"
          placeholder="Search for contributor"
          className="min-w-0 flex-1 bg-transparent pr-6 text-[20px] leading-normal text-r-secondary placeholder:text-r-secondary outline-none [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear contributor search"
            onClick={() => {
              onQueryChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-5 rounded-full p-1 text-r-secondary transition hover:text-r-text focus-visible:outline-2 focus-visible:outline-r-muted"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex w-[206px] items-center justify-between text-[24px] leading-none text-r-text [font-family:var(--font-family-display)]">
        {count > 0 && (
          <button type="button" onClick={onPrevious} aria-label="Previous contributor" className="flex h-[50px] w-[44px] items-center justify-center rounded transition hover:opacity-70 focus-visible:outline-2 focus-visible:outline-r-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/contributor-previous.png" alt="" width={25} height={50} />
          </button>
        )}
        <span role="status" aria-live="polite" aria-label={`${count} matching contributor${count === 1 ? "" : "s"}`}>
          {count > 0 ? `${index + 1}/${count}` : "0 contributors"}
        </span>
        {count > 0 && (
          <button type="button" onClick={onNext} aria-label="Next contributor" className="flex h-[50px] w-[44px] items-center justify-center rounded transition hover:opacity-70 focus-visible:outline-2 focus-visible:outline-r-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/contributor-next.png" alt="" width={25} height={50} />
          </button>
        )}
      </div>
    </div>
  );
}
