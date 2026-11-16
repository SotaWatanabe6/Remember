"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthButton from "./AuthButton.jsx";
import AuthInput from "./AuthInput.jsx";
import { login } from "../../services/authService.js";
import { getOrganizerReturnPath } from "../../lib/organizerReturnPath.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [staySignedIn, setStaySignedIn] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!emailPattern.test(values.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!values.password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isLoading || !validate()) {
      return;
    }

    setIsLoading(true);
    setSubmitError("");

    try {
      await login({ email: values.email.trim(), password: values.password, staySignedIn });
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(getOrganizerReturnPath(next));
    } catch (error) {
      setSubmitError(error.message || "Unable to log in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full flex-col gap-[30px]"
    >
      <div className="flex w-full flex-col gap-[30px]">
        <AuthInput
          id="login-email"
          name="email"
          label="Email Address"
          type="email"
          value={values.email}
          onChange={updateField}
          placeholder="jane@example.com"
          autoComplete="email"
          error={errors.email}
          disabled={isLoading}
        />
        <AuthInput
          id="login-password"
          name="password"
          label="Password"
          type="password"
          value={values.password}
          onChange={updateField}
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password}
          disabled={isLoading}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-base">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-r-text">
          <input
            type="checkbox"
            checked={staySignedIn}
            onChange={(event) => setStaySignedIn(event.target.checked)}
            disabled={isLoading}
            className="size-4 accent-r-text"
          />
          Stay signed in
        </label>
        <Link
          href="/forgot-password"
          className="text-r-secondary underline underline-offset-4 hover:text-r-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
        >
          Forgot password?
        </Link>
      </div>
      <AuthButton isLoading={isLoading}>Log in</AuthButton>
      {submitError ? (
        <p className="text-center text-sm leading-5 text-red-600" role="alert">
          {submitError}
        </p>
      ) : null}
    </form>
  );
}
