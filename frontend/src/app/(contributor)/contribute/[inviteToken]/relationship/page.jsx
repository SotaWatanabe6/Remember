import RelationshipSelector from "@/components/contributor/RelationshipSelector.jsx";

export default async function ContributorRelationshipPage({ params }) {
  const { inviteToken } = await params;

  return <RelationshipSelector inviteToken={inviteToken} />;
}
