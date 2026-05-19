import Link from "next/link";

export default function PlaceholderPage({ title, description, eyebrow }) {
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px]">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-12">
        <nav className="flex h-10 items-center justify-between" aria-label="Placeholder">
          <Link
            href="/"
            className="text-2xl leading-8 text-neutral-950 transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
          >
            Remember
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full px-3 py-2 text-base font-medium leading-6 text-slate-700 transition hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
          >
            Dashboard
          </Link>
        </nav>

        <section className="rounded-[20px] border border-[#e2e8f0] bg-white p-8 shadow-auth sm:p-12">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-[34px] font-medium leading-tight text-neutral-950 sm:text-[40px]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
        </section>
      </div>
    </main>
  );
}
