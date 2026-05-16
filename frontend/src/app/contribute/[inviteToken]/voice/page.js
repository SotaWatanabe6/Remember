import PlaceholderPage from "@/components/placeholders/PlaceholderPage.jsx";

export default async function ContributionVoicePage({ params }) {
  const { inviteToken } = await params;

  return (
    <PlaceholderPage
      eyebrow={`Invite ${inviteToken}`}
      title="Voice Contributions"
      description="This placeholder keeps the App Router path ready for voice memories."
    />
  );
}
