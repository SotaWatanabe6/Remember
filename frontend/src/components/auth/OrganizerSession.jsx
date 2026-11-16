"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabaseClient.js";

export default function OrganizerSession({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const goToLogin = () => {
      setStatus("checking");
      const { pathname, search, hash } = window.location;
      const next = new URLSearchParams({ next: pathname + search + hash });
      router.replace(`/login?${next}`);
    };

    try {
      const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
        if (session) setStatus("signed-in");
        else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") goToLogin();
      });
      return () => subscription.unsubscribe();
    } catch {
      // Keep organizer content hidden if the authentication client is unavailable.
      queueMicrotask(() => setStatus("unavailable"));
    }
  }, [router]);

  if (status === "signed-in") return children;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center text-r-secondary">
      {status === "unavailable" ? (
        <p role="alert">Sign-in is unavailable. Refresh the page to try again.</p>
      ) : (
        <p role="status">Checking your sign-in…</p>
      )}
    </main>
  );
}
