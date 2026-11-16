"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthButton from "./AuthButton.jsx";
import AuthInput from "./AuthInput.jsx";
import { exchangePasswordResetCode, resetPassword } from "../../services/authService.js";

export default function ResetPasswordForm() {
  const verification = useRef(null);
  const [status, setStatus] = useState("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!verification.current) {
      const { pathname, search } = window.location;
      const code = new URLSearchParams(search).get("code");
      window.history.replaceState(null, "", pathname);
      verification.current = code ? exchangePasswordResetCode(code) : Promise.reject();
    }
    let active = true;
    verification.current.then(
      () => { if (active) setStatus("ready"); },
      () => { if (active) setStatus("invalid"); },
    );
    return () => { active = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || status !== "ready") return;
    if (password !== confirmation) {
      setError("Passwords don’t match.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await resetPassword(password);
      setPassword("");
      setConfirmation("");
      setStatus("complete");
    } catch (failure) {
      if (failure.status === 401 || failure.code === "session_not_found" || failure.name === "AuthSessionMissingError") {
        setStatus("invalid");
      } else {
        setError(failure.message || "We couldn’t save your password. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (status === "checking") return <p role="status" className="text-center">Checking your reset link…</p>;
  if (status === "complete") return <p role="status" className="text-center">Your password has been updated. Log in with your new password.</p>;
  if (status === "invalid") {
    return (
      <div className="space-y-4 text-center">
        <p role="alert">This reset link is invalid or expired. Request a new link and open it in the same browser.</p>
        <Link href="/forgot-password" className="font-medium underline underline-offset-4">Request a new link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[30px]">
      <AuthInput id="new-password" name="password" label="New password" type="password"
        value={password} onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password" minLength={6} required disabled={saving} />
      <AuthInput id="confirm-password" name="passwordConfirmation" label="Confirm new password" type="password"
        value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
        autoComplete="new-password" required disabled={saving} />
      <AuthButton isLoading={saving}>Save new password</AuthButton>
      {error ? <p role="alert" className="text-center text-sm text-r-danger">{error}</p> : null}
    </form>
  );
}
