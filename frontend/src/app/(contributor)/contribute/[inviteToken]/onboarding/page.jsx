import { ContributorOnboardingBrief } from "@/components/contributor/ContributorInviteLanding.jsx";

export default async function ContributorOnboardingPage({ params }) {
  const { inviteToken } = await params;
  return <ContributorOnboardingBrief inviteToken={inviteToken} />;
}