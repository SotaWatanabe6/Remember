"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "./AuthButton.jsx";
import AuthInput from "./AuthInput.jsx";
import { signup } from "../../services/authService.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSubmitError("");
    setSuccessMessage("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

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

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setSubmitError("");
    setSuccessMessage("");

    try {
      const result = await signup({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      if (result.needsEmailConfirmation) {
        setSuccessMessage("Account created. Check your email to confirm your address before logging in.");
      } else {
        setSuccessMessage("Account created. Taking you to your dashboard...");
        router.replace("/dashboard");
      }
    } catch (error) {
      setSubmitError(error.message || "Unable to create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-[30px]">
      <div className="flex w-full flex-col gap-[30px] rounded-[20px] border border-slate-200 bg-white px-[29px] py-[31px] shadow-auth sm:px-[41px] sm:py-[41px]">
        <AuthInput
          id="signup-full-name"
          name="fullName"
          label="Full Name"
          type="text"
          value={values.fullName}
          onChange={updateField}
          placeholder="Your Name"
          autoComplete="name"
          error={errors.fullName}
        />
        <AuthInput
          id="signup-email"
          name="email"
          label="Email Address"
          type="email"
          value={values.email}
          onChange={updateField}
          placeholder="jane@example.com"
          autoComplete="email"
          error={errors.email}
        />
        <AuthInput
          id="signup-password"
          name="password"
          label="Password"
          type="password"
          value={values.password}
          onChange={updateField}
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password}
        />
      </div>
      <AuthButton isLoading={isLoading}>Sign Up</AuthButton>
      {submitError ? (
        <p className="text-center text-sm leading-5 text-red-600" role="alert">
          {submitError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-center text-sm leading-5 text-emerald-700" role="status">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}
