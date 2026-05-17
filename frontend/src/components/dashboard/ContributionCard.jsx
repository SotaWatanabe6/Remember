export default function ContributionCard() {
  return (
    <article className="rounded-[10px] border border-[#90a1b9] bg-[rgba(144,161,185,0.12)] p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex size-[76px] shrink-0 items-center justify-center bg-[#d9d9d9] text-xs font-medium uppercase tracking-[0.14em] text-slate-500 sm:size-[100px]">
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-8 text-black sm:text-2xl">
            Contributor Name
          </h3>
          <p className="mt-1 text-lg font-light leading-7 text-black sm:text-xl">
            Media Title
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {["Publish", "Archive"].map((action) => (
            <button
              key={action}
              type="button"
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
