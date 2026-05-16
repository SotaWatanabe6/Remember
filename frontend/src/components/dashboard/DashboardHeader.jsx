import Link from "next/link";

export default function DashboardHeader() {
  return (
    <header className="flex w-full items-center justify-between gap-4">
      <Link
        href="/"
        className="text-2xl leading-8 text-neutral-950 transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
      >
        Remember
      </Link>

      <nav className="flex items-center gap-[13px]" aria-label="Dashboard sections">
        <Link
          href="/dashboard"
          className="hidden h-[45px] min-w-[130px] items-center justify-center rounded-full bg-[rgba(21,93,252,0.19)] px-5 text-sm font-medium leading-6 text-[#155dfc] shadow-[0_3px_4px_rgba(0,0,0,0.22)] transition hover:bg-[rgba(21,93,252,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#155dfc] sm:flex lg:min-w-[181px] lg:text-[20px] lg:leading-[30px]"
        >
          Loved Ones
        </Link>
        <Link
          href="/dashboard"
          className="hidden h-[45px] min-w-[130px] items-center justify-center rounded-full bg-[rgba(152,16,250,0.19)] px-5 text-sm font-medium leading-6 text-[#9810fa] shadow-[0_3px_4px_rgba(0,0,0,0.22)] transition hover:bg-[rgba(152,16,250,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9810fa] sm:flex lg:min-w-[181px] lg:text-[20px] lg:leading-[30px]"
        >
          Contributors
        </Link>
        <span className="block size-[45px] rounded-full bg-neutral-950" aria-hidden="true" />
      </nav>
    </header>
  );
}
