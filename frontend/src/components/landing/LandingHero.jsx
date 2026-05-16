import Link from "next/link";

export default function LandingHero() {
  return (
    <section
      className="flex w-full flex-col items-center text-center"
      aria-labelledby="landing-hero-title"
    >
      <div className="flex size-[160px] items-center justify-center rounded-full bg-[#cad5e2] text-xs leading-normal text-black sm:size-[200px]">
        logo
      </div>

      <div className="mt-[72px] flex w-full max-w-[768px] flex-col items-center gap-5 sm:mt-[100px]">
        <h1
          id="landing-hero-title"
          className="text-[34px] font-medium leading-none tracking-normal text-neutral-950 sm:text-[40px]"
        >
          Preserve Their Legacy Together
        </h1>
        <p className="max-w-[768px] text-lg leading-snug text-slate-600 sm:text-xl sm:leading-none">
          Create a private, dignified space where family and friends can share memories of your loved one.
        </p>
      </div>

      <Link
        href="/signup"
        className="mt-[50px] flex h-[67px] w-full max-w-[434px] items-center justify-center rounded-full bg-[#0a0a0a] px-10 text-center text-[20px] font-bold leading-[30px] text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500"
      >
        Create a memorial
      </Link>
    </section>
  );
}
