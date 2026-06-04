import DashboardHeader from "./DashboardHeader.jsx";

function MemorialAvatar({ name }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <div className="flex size-[112px] shrink-0 items-center justify-center rounded-full bg-[#d9d9d9] text-3xl font-semibold text-slate-500 sm:size-[164px]">
      {initials}
    </div>
  );
}

export default function DashboardShell({ memorial, children }) {
  return (
    <main className="min-h-screen bg-r-bg px-5 pb-12 pt-8 text-neutral-950 sm:px-[50px] sm:pb-[47px] sm:pt-[50px]">
      <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-[34px]">
        <DashboardHeader />

        <section className="rounded-[20px] border border-[#e2e8f0] bg-white px-6 py-8 shadow-auth sm:px-[50px] sm:py-[63px]">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-[40px] font-bold leading-[46px] text-black sm:text-[48px] sm:leading-[56px]">
                {memorial.fullName}
              </h1>
              <p className="mt-1 text-xl font-light leading-8 text-black sm:text-2xl">
                Years Lived ({memorial.lifespan})
              </p>
              <p className="mt-2 max-w-3xl text-xl font-light italic leading-8 text-[#868686] sm:text-2xl">
                {memorial.shortBiography}
              </p>
            </div>
            <MemorialAvatar name={memorial.fullName} />
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
