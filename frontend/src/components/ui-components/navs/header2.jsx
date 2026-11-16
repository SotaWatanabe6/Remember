"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HeaderBrand from "./header-brand";
import { logout } from "@/services/authService.js";

export default function Header2({ backHref, signOut = false }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await logout();
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }

    router.back();
  };

  return (
    <header className="mx-auto flex w-full max-w-[1340px] items-center  font-(--font-family-body) justify-between">
      <HeaderBrand />
      <div>
        <button
          type="button"
          onClick={signOut ? handleSignOut : handleBack}
          disabled={signingOut}
          className="flex items-center gap-2 text-[16px] font-medium leading-[24px] text-(--text-color-2) transition hover:text-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
        >
          {!signOut && <span>
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
          </span>}
          {signOut ? (signingOut ? "Signing out…" : "Sign out") : "Back"}
        </button>
        {signOutError && <p role="alert" className="mt-2 text-sm text-r-danger">{signOutError}</p>}
      </div>
    </header>
  );
}
