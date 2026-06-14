import Link from "next/link";
import { RememberLogoMark } from "@/components/brand/RememberLogo.jsx";

export default function LandingHero() {
  return (
    <section
      className="flex w-full flex-col items-center text-center"
      aria-labelledby="landing-hero-title"
    >
      <RememberLogoMark className="h-[211px] w-[200px]" priority />

      <div className="mt-[72px] flex w-full max-w-[768px] flex-col items-center gap-5 sm:mt-[100px]">
        <h1
          id="landing-hero-title"
          className="font-display text-[40px] font-bold leading-none tracking-normal text-r-text"
        >
          Preserve Their Legacy Together
        </h1>
        <p className="max-w-[768px] text-[20px] font-normal leading-[1.2] text-r-secondary">
          Create a private, dignified space where family and friends can share
          memories of your loved one.
        </p>
      </div>

      <Link
        href="/signup"
        className="mt-[50px] flex h-[67px] w-full max-w-[434px] items-center justify-center rounded-full bg-r-btn px-10 text-center text-[20px] font-normal leading-none text-r-btn-text transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
      >
        Create a memorial
      </Link>
    </section>
  );
}
