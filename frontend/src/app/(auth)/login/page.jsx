import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import LoginForm from "@/components/auth/LoginForm.jsx";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Log in to manage your memorials"
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-bold text-r-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus"
          >
            Sign Up
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
