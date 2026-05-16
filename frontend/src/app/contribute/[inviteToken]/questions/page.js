import PlaceholderPage from "@/components/placeholders/PlaceholderPage.jsx";

export default async function ContributionQuestionsPage({ params }) {
  const { inviteToken } = await params;

  return (
    <PlaceholderPage
      eyebrow={`Invite ${inviteToken}`}
      title="Contribution Questions"
      description="This placeholder keeps the App Router path ready for written memory prompts."
    />
  );
}
