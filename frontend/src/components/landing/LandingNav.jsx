import Link from "next/link";
import RememberLogo from "@/components/brand/RememberLogo.jsx";

export default function LandingNav() {
  return (
    <header className="w-full">
      <nav
        className="mx-auto flex h-10 w-full max-w-[1340px] items-center justify-between font-(--font-family-body)"
        aria-label="Primary"
      >
        <div className="flex items-center justify-center gap-4">
          <img
            src="/Logo.svg"
            alt="Logo"
            width={40}
            height={40}
          />
          <div className="text-2xl text-center leading-8 text-neutral-950">Remember</div>
        </div>
        <Link
          href="/login"
          className="min-h-10 rounded-full px-3 py-2 text-center text-base font-normal leading-none text-r-text transition hover:text-r-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
        >
          Log In / Sign Up
        </Link>
      </nav>
    </header>
  );
}
