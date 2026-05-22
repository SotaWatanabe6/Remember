import Link from "next/link";

export default function MemorialCreateHeader() {
  return (
    <header className="mx-auto flex h-10 w-full max-w-[1340px] items-center justify-between">
      <Link
        href="/"
        className="text-2xl leading-8 text-neutral-950 transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
      >
        Remember
      </Link>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-base font-medium leading-6 text-slate-700 transition hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
      >
        <span aria-hidden="true">←</span>
        Back
      </Link>
    </header>
  );
}
