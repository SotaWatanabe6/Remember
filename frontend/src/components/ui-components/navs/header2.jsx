"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/services/authService";
import HeaderBrand from "./header-brand";

export default function Header2({ backHref, backLabel = "Back", signOut = false }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  };

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }

    router.back();
  };

  return (
    <header className="mx-auto flex w-full max-w-[1340px] flex-wrap items-center gap-4 font-(--font-family-body) justify-between">
      <HeaderBrand />
      <div className="ml-auto">
        <button
          type="button"
          onClick={signOut ? handleSignOut : handleBack}
          disabled={signingOut}
          className={`-mr-3 flex items-center gap-[10px] rounded-full px-3 py-2 text-[16px] font-normal leading-[24px] transition-colors hover:bg-r-card hover:text-r-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:opacity-50 disabled:cursor-wait ${signOut ? "text-[#C16341]" : "text-r-text"}`}
        >
          {!signOut && <img src="/icons/design/back.svg" width={24} height={24} alt="" aria-hidden="true" />}
          {signOut ? signingOut ? "Signing out…" : "Sign out" : backLabel}
        </button>
        {error && <p role="alert" className="mt-2 text-sm text-r-danger">{error}</p>}
      </div>
    </header>
  );
}
