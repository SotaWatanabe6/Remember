import { PublicContributorPage } from "@/components/contributor/ContributorInviteLanding.jsx";

export default async function ContributorPublicContributorRoute({ params }) {
  const { inviteToken } = await params;
  return <PublicContributorPage inviteToken={inviteToken} />;
}
