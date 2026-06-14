import Link from "next/link";

export default function LandingNav() {
  return (
    <header className="w-full">
      <nav
        className="mx-auto flex h-10 w-full max-w-[1340px] items-center justify-between font-(--font-family-body)"
        aria-label="Primary"
      >
        <div className="text-2xl leading-8 text-neutral-950">Remember</div>
        <Link
          href="/login"
          className="min-h-10 rounded-full px-3 py-2 text-center text-base font-medium leading-6 text-slate-700 transition hover:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
        >
          Log In / Sign Up
        </Link>
      </nav>
    </header>
  );
}
