"use client";

import { useState } from "react";
import AuthButton from "./AuthButton.jsx";
import AuthInput from "./AuthInput.jsx";
import { requestPasswordReset } from "../../services/authService.js";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (failure) {
      if (failure.code === "user_not_found") {
        setSent(true);
      } else {
        setError(failure.status === 429
          ? "Please wait a minute before requesting another reset link."
          : "We couldn’t send a reset link. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="text-center text-r-secondary">
        If an account exists for that address, you’ll receive a reset link.
        Open it in the same browser you used to request it.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[30px]">
      <AuthInput id="recovery-email" name="email" label="Email Address" type="email"
        value={email} onChange={(event) => setEmail(event.target.value)}
        placeholder="jane@example.com" autoComplete="email" required disabled={sending} />
      <AuthButton isLoading={sending}>Send reset link</AuthButton>
      {error ? <p role="alert" className="text-center text-sm text-r-danger">{error}</p> : null}
    </form>
  );
}
