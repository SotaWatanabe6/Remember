import { redirect } from "next/navigation";

export default async function ContributorCompletePage({ params }) {
  const { inviteToken } = await params;

  redirect(`/contribute/${inviteToken}/submitted`);
}
