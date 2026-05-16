"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "./AuthButton.jsx";
import AuthInput from "./AuthInput.jsx";
import { login } from "../../services/authService.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setSubmitError("");

    try {
      await login({ email: values.email.trim(), password: values.password });
      router.push("/dashboard");
    } catch (error) {
      setSubmitError(error.message || "Unable to log in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-[30px]">
      <div className="flex w-full flex-col gap-[30px] rounded-[20px] border border-slate-200 bg-white px-[29px] py-[41px] shadow-auth sm:px-[41px]">
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
        />
      </div>
      <AuthButton isLoading={isLoading}>Log In</AuthButton>
      {submitError ? (
        <p className="text-center text-sm leading-5 text-red-600" role="alert">
          {submitError}
        </p>
      ) : null}
    </form>
  );
}
