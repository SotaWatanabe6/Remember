import { Check, ImageIcon, Mic, Play, Sparkles, Trash2 } from "lucide-react";

function formatSubmittedDate(value) {
  if (!value) return "May 1, 2026";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "May 1, 2026";
  }
}

function PhotoTile({ checked = false }) {
  return (
    <div className="relative aspect-square rounded-[2px] bg-[#D8C8AF]">
      <div className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-[2px] border border-[#5F5A52] bg-transparent">
        {checked ? <Check size={16} className="text-[#5F5A52]" /> : null}
      </div>
    </div>
  );
}

function ActionButtons({ contributors, onDelete }) {
  return (
    <div className="flex items-center gap-8">
      <button type="button" className="text-[#3F3A33] transition hover:opacity-70" aria-label="Approve submission">
        <Check size={34} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-label="Delete submission"
        onClick={() => {
          if (window.confirm("Delete this contribution? This cannot be undone.")) {
            onDelete?.(contributors?.id);
          }
        }}
        className="text-[#C96E43] transition hover:opacity-70"
      >
        <Trash2 size={34} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export default function MemorialContributionApproval({ contributors, gallery, onDelete }) {
  const submittedDate = formatSubmittedDate(contributors?.submitted_at);
  const contributorName = contributors?.name || "Jane Smith";
  const relationship = contributors?.relationship_type || "Relationship";
  const contributionCount = Number.isFinite(gallery) ? gallery : 0;

  if (!gallery) {
    return (
      <div className="py-16 text-center font-family-body text-[18px] leading-[24px] text-[#5F5A52]">
        No contributions awaiting approval.
      </div>
    );
  }

  return (
    <div className="mx-auto flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <article className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-10">
          <h2 className="font-family-display text-[24px] leading-[28px] text-r-text">
            {contributorName}
          </h2>
          <p className="mt-4 font-family-body text-[16px] leading-[20px] text-[#5F5A52]">
            {contributionCount} contributions
          </p>
          <p className="mt-3 font-family-body text-[16px] leading-[20px] text-[#5F5A52]">
            Last submitted {submittedDate}
          </p>
          <div className="mt-8 inline-flex min-h-[42px] min-w-[162px] items-center justify-center rounded-[12px] bg-[#B9C493] px-6 font-family-body text-[12px] leading-[16px] text-[#4D523A]">
            {relationship}
          </div>
        </article>

        <article className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-10">
          <div className="flex items-start gap-4">
            <Sparkles className="mt-1 text-[#3F3A33]" size={28} />
            <p className="max-w-3xl font-family-body text-[20px] leading-[30px] text-[#5F5A52]">
              This can be an AI generated summary of the contribution, either mentioning surfaced themes or flagged submissions that may be sensitive or inappropriate.
            </p>
          </div>
        </article>
      </div>

      <section className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-7">
        <div className="grid grid-cols-[300px_1fr] gap-8">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-[4px] bg-[#4B463E] p-2 text-[#F6EFE7]">
              <ImageIcon size={24} />
            </div>
            <div>
              <p className="font-family-body text-[16px] leading-[20px] text-[#5F5A52]">
                Contributor Name added 5 photos
              </p>
              <p className="mt-3 font-family-body text-[14px] leading-[18px] text-[#5F5A52]">
                Submitted {submittedDate}
              </p>
            </div>
          </div>

          <div>
            <div className="grid max-w-[520px] grid-cols-3 gap-4">
              <PhotoTile />
              <PhotoTile />
              <PhotoTile />
              <PhotoTile checked />
              <PhotoTile checked />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <label className="flex items-center gap-4 font-family-body text-[18px] leading-[20px] text-[#5F5A52]">
                <span className="flex size-6 items-center justify-center rounded-[2px] border border-[#5F5A52]" />
                Select All
              </label>
              <ActionButtons contributors={contributors} onDelete={onDelete} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-7">
        <div className="grid grid-cols-[300px_1fr_auto] items-start gap-8">
          <div className="flex items-start gap-4">
            <Mic className="mt-1 text-[#3F3A33]" size={28} />
            <div>
              <p className="font-family-body text-[16px] leading-[20px] text-[#5F5A52]">
                Contributor Name added 1 audio
              </p>
              <p className="mt-3 font-family-body text-[14px] leading-[18px] text-[#5F5A52]">
                Submitted {submittedDate}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-5">
              <button type="button" className="flex size-[48px] items-center justify-center rounded-full bg-[#3F3A33] text-[#F6EFE7]">
                <Play size={20} fill="currentColor" />
              </button>
              <div className="flex items-center gap-[3px]">
                {Array.from({ length: 22 }).map((_, index) => (
                  <span
                    key={index}
                    className="w-[4px] rounded-full bg-[#3F3A33]"
                    style={{ height: `${18 + ((index * 7) % 22)}px` }}
                  />
                ))}
              </div>
            </div>
            <p className="mt-8 max-w-[760px] font-family-body text-[20px] italic leading-[30px] text-[#5F5A52]">
              “When played, an audio transcript generated by AI will play alongside the audio. It&apos;ll look something like this.”
            </p>
          </div>

          <div className="self-end">
            <ActionButtons contributors={contributors} onDelete={onDelete} />
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-r-border bg-[#F6EFE7] p-7">
        <div className="grid grid-cols-[300px_1fr_auto] items-start gap-8">
          <div className="flex items-start gap-4">
            <div className="mt-1 text-[#3F3A33]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="font-family-body text-[16px] leading-[20px] text-[#5F5A52]">
                Contributor Name added 1 story
              </p>
              <p className="mt-3 font-family-body text-[14px] leading-[18px] text-[#5F5A52]">
                Submitted {submittedDate}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-family-display text-[36px] leading-[40px] text-r-text">
              Story Title
            </h3>
            <p className="mt-4 font-family-body text-[20px] leading-[30px] text-[#5F5A52]">
              An AI generated summary of the story will be featured here.
            </p>
          </div>

          <div className="self-end">
            <ActionButtons contributors={contributors} onDelete={onDelete} />
          </div>
        </div>
      </section>
    </div>
  );
}
