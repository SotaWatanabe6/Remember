import ContributorInviteLanding from "@/components/contributor/ContributorInviteLanding.jsx";

export default async function ContributePage({ params }) {
  const { inviteToken } = await params;
  return <ContributorInviteLanding inviteToken={inviteToken} />;
}