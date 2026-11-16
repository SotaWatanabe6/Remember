import Link from "next/link";
import AuthLayout from "@/components/auth/AuthLayout.jsx";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm.jsx";

export const metadata = { referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Reset your password" subtitle="Choose a new password for your Remember account."
      footer={<Link className="font-medium underline underline-offset-4" href="/login">Back to Log in</Link>}>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
