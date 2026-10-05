"use client";

import { useMemo, useState } from "react";
import ContributorNavigation from "@/components/organizer/ContributorNavigation";
import { getArchiveQaGroups, matchesContributorName } from "@/lib/organizer/contributorSearch";

function formatSubmittedDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function ArchiveQaPanel({ contributors, responses }) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const groups = useMemo(() => getArchiveQaGroups(contributors, responses)
    .filter(({ contributor }) => matchesContributorName(contributor, query)), [contributors, responses, query]);
  const index = Math.min(currentIndex, Math.max(groups.length - 1, 0));
  const current = groups[index];
  const submittedDate = formatSubmittedDate(current?.contributor.submitted_at);

  return (
    <div className="flex flex-col gap-[30px]">
      <ContributorNavigation
        query={query}
        onQueryChange={(value) => { setQuery(value); setCurrentIndex(0); }}
        index={index}
        count={groups.length}
        onPrevious={() => setCurrentIndex(index === 0 ? groups.length - 1 : index - 1)}
        onNext={() => setCurrentIndex((index + 1) % groups.length)}
      />
      {current ? (
        <>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 [font-family:var(--font-family-display)]">
              <h3 className="break-words text-[36px] italic leading-[44px] text-r-secondary">{current.contributor.name?.trim() || "Unnamed contributor"}</h3>
              {submittedDate && <p className="mt-[10px] text-[24px] leading-8 text-r-text">Submitted {submittedDate}</p>}
            </div>
            <span className="flex min-h-[50px] shrink-0 items-center justify-center rounded-[14px] bg-[#D9D9D9] px-6 py-3 text-[12px] text-r-text sm:min-w-[207px]">
              {current.contributor.relationship_label || current.contributor.relationship_type || "No relationship"}
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {current.responses.map((response) => (
              <article key={response.id} className="flex flex-col gap-5 rounded-[20px] border border-r-muted p-5 sm:p-[30px]">
                <h4 className="break-words text-[24px] leading-8 text-r-text [font-family:var(--font-family-display)]">{response.question_text || "Question"}</h4>
                {response.answer_text && <p className="whitespace-pre-wrap break-words text-[20px] leading-[30px] text-r-secondary">{response.answer_text}</p>}
                {response.response_audio_url && <audio controls src={response.response_audio_url} className="w-full" aria-label="Recorded answer" />}
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-[18px] border border-r-border px-8 py-14 text-center">
          <h3 className="text-[24px] leading-8 text-r-text [font-family:var(--font-family-display)]">
            {query.trim() ? "No contributors match your search" : "No approved Q&A yet"}
          </h3>
          <p className="mt-3 text-[16px] leading-6 text-r-secondary">
            {query.trim() ? "Clear the search to see every contributor with approved answers." : "Approved questionnaire answers will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
