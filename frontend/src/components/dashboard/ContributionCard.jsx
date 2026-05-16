function formatSubmittedAt(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ContributionCard({ contribution, mockAction, onMockAction }) {
  const isFlagged = contribution.aiFlagStatus !== "Clear";

  return (
    <article
      className={`rounded-[10px] border p-5 sm:p-8 lg:p-10 ${
        isFlagged
          ? "border-rose-200 bg-rose-50/60"
          : "border-[#90a1b9] bg-[rgba(144,161,185,0.12)]"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex size-[76px] shrink-0 items-center justify-center bg-[#d9d9d9] text-xs font-medium uppercase tracking-[0.14em] text-slate-500 sm:size-[100px]">
          {contribution.type.split(" ")[0]}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold leading-8 text-black sm:text-2xl">
              {contribution.contributorName}
            </h3>
          </div>
          <p className="mt-1 text-lg font-light leading-7 text-black sm:text-xl">
            {contribution.title}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm leading-6 text-slate-700 sm:text-base">
            <div>
              <dt className="sr-only">Relationship</dt>
              <dd>{contribution.relationship}</dd>
            </div>
            <div>
              <dt className="sr-only">Contribution type</dt>
              <dd>{contribution.type}</dd>
            </div>
            <div>
              <dt className="sr-only">Submitted date</dt>
              <dd>{formatSubmittedAt(contribution.submittedAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            {contribution.preview}
          </p>
          {mockAction ? (
            <p className="mt-3 text-sm font-medium leading-6 text-[#155dfc]" aria-live="polite">
              {mockAction}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {["Review", "Approve", "Delete"].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onMockAction(contribution.id, `${action} selected (mock only)`)}
              className="h-[41px] rounded-[5px] bg-white px-[15px] text-base font-light text-black transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155dfc] sm:text-xl"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
