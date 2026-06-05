import MemorialCoverImage from "@/components/memorial/MemorialCoverImage.jsx";
import { isBrowserImageUrl } from "@/lib/memorialCoverImage.js";

const badgeClasses = {
  collecting: "bg-[#F8E7AE] text-[#5A4300]",
  generating: "bg-[#CFE6F6] text-[#14415B]",
  complete: "bg-[#D9EFD4] text-[#1D4D22]",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatYear(dateString) {
  if (!dateString) {
    return null;
  }

  return new Date(dateString).getFullYear();
}

function formatLastUpdated(dateString) {
  if (!dateString) {
    return "Recently updated";
  }

  return dateFormatter.format(new Date(dateString));
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function MemorialPreview({ memorial }) {
  if (isBrowserImageUrl(memorial.cover_photo_url)) {
    return (
      <div className="relative h-[210px] w-full overflow-hidden rounded-[20px] border border-[#D7DBE2] bg-[#E8EDF3]">
        <MemorialCoverImage
          src={memorial.cover_photo_url}
          name={memorial.subject_name}
          alt={`Cover photo for ${memorial.subject_name}`}
          fill
          rounded="rounded-[20px]"
          className="h-full w-full"
          fallbackClassName="bg-[#E8EDF3] text-[#5F6848] text-4xl"
        />
      </div>
    );
  }

  return (
    <div className="relative h-[210px] w-full overflow-hidden rounded-[20px] border border-[#D7DBE2] bg-white">
      <span className="absolute inset-0 border-t border-[#D7DBE2]" />
      <span className="absolute left-0 top-0 h-full w-full origin-top-left rotate-[20deg] border-t border-[#D7DBE2]" />
      <span className="absolute left-0 top-0 h-full w-full origin-top-right -rotate-[20deg] border-t border-[#D7DBE2]" />
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex min-h-[30px] items-center rounded-[8px] px-4 text-[16px] leading-[24px] ${
        badgeClasses[status] ?? "bg-[#D9D9D9] text-[#262626]"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

export default function AccountProfileCard({ memorial }) {
  const birthYear = formatYear(memorial.date_of_birth);
  const passingYear = formatYear(memorial.date_of_passing);
  const dateRange =
    birthYear || passingYear
      ? `${birthYear ?? "Unknown"} - ${passingYear ?? "Unknown"}`
      : "Dates unavailable";

  return (
    <article className="rounded-[20px] border border-[#D7DBE2] bg-white p-0 shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
      <MemorialPreview memorial={memorial} />
      <div className="flex flex-col gap-3 px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-h3 text-[#0A0A0A]">{memorial.subject_name}</h2>
            <p className="mt-2 text-body-1 text-(--text-color-2)">
              {dateRange}
            </p>
          </div>
          <StatusBadge status={memorial.status} />
        </div>
        <p className="text-body-1 text-(--text-color-2)">
          Last Updated: {formatLastUpdated(memorial.updated_at ?? memorial.created_at)}
        </p>
      </div>
    </article>
  );
}
