import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm.jsx";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Forgot password?" subtitle="Enter the email address for your Remember account."
      footer={<Link className="font-medium underline underline-offset-4" href="/login">Back to Log in</Link>}>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
