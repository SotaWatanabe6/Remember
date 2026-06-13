// frontend/src/app/(contributor)/contribute/[inviteToken]/relationship/family/page.jsx

import RelationshipFamilySelector from "@/components/contributor/RelationshipFamilySelector.jsx";

export default async function ContributorRelationshipFamilyPage({ params }) {
  const { inviteToken } = await params;

  return <RelationshipFamilySelector inviteToken={inviteToken} />;
}
