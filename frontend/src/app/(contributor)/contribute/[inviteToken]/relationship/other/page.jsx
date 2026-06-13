// frontend/src/app/(contributor)/contribute/[inviteToken]/relationship/other/page.jsx

import RelationshipOtherSelector from "@/components/contributor/RelationshipOtherSelector.jsx";

export default async function ContributorRelationshipOtherPage({ params }) {
  const { inviteToken } = await params;

  return <RelationshipOtherSelector inviteToken={inviteToken} />;
}
