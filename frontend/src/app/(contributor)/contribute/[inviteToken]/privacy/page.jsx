import PrivacySelector from "@/components/contributor/PrivacySelector.jsx";

export default async function ContributorPrivacyPage({ params }) {
  const { inviteToken } = await params;

  return <PrivacySelector inviteToken={inviteToken} />;
}
