import MemorialCoverImage from "@/components/memorial/MemorialCoverImage.jsx";
import { getDashboardStatus } from "./dashboard-status";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatLastUpdated(dateString) {
  if (!dateString) return "Recently updated";
  return dateFormatter.format(new Date(dateString));
}

function formatContributionCount(count) {
  const safeCount = Number.isFinite(count) ? count : 0;
  return `${safeCount} contribution${safeCount === 1 ? "" : "s"}`;
}

// Now shows the cover photo if available, falls back to empty placeholder
function MemorialPreview({ src, name }) {
  return (
    <div className="relative h-[255px] w-full overflow-hidden rounded-[22px] border border-r-border bg-[#F4ECE5]">
      <span className="absolute inset-0 rounded-[22px] border border-r-border z-10 pointer-events-none" />
      {src && (
        <MemorialCoverImage
          src={src}
          name={name}
          fill
          rounded="rounded-none"
          className="h-full w-full"
        />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const display = getDashboardStatus(status);
  return (
    <span
      className={`inline-flex min-h-[44px] min-w-[180px] items-center justify-center rounded-[14px] px-5 text-[14px] leading-[20px] ${display.className}`}
    >
      {display.label}
    </span>
  );
}

export default function AccountProfileCard({ memorial }) {
  return (
    <article className="rounded-[28px] border border-r-border bg-[#F2EAE2] p-0">
      <MemorialPreview
        src={memorial.cover_photo_url || memorial.profile_photo_url || null}
        name={memorial.subject_name}
      />
      <div className="flex flex-col gap-3 px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-family-display text-[34px] leading-[40px] text-r-text">
              {memorial.subject_name}
            </h2>
            <p className="mt-2 font-family-body text-[16px] leading-[24px] text-r-secondary">
              {formatContributionCount(memorial.contribution_count)}
            </p>
          </div>
          <StatusBadge status={memorial.status} />
        </div>
        <p className="font-family-body text-[16px] leading-[24px] text-r-secondary">
          Last Updated: {formatLastUpdated(memorial.updated_at ?? memorial.created_at)}
        </p>
      </div>
    </article>
  );
}
