import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import SignupForm from "@/components/auth/SignupForm.jsx";

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Create a space to Remember your loved one."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400"
          >
            Log In
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}
