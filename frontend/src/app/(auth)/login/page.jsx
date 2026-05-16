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
            className="font-bold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
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
