"use client";

import { useRouter } from "next/navigation";

export default function Header2({ backHref }) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }

    router.back();
  };

  return (
    <header className="mx-auto flex w-full max-w-[1340px] items-center justify-between">
      <div className="logo">
        <p className="text-[24px] font-normal text-(--text-color-1)">Remember</p>
      </div>
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-[16px] font-medium leading-[24px] text-(--text-color-2) transition hover:text-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
        >
          <span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M5 12h14M5 12l4-4m-4 4l4 4"
              />
            </svg>
          </span>
          Back
        </button>
      </div>
    </header>
  );
}
