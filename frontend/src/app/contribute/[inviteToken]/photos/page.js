import PlaceholderPage from "@/components/placeholders/PlaceholderPage.jsx";

export default async function ContributionPhotosPage({ params }) {
  const { inviteToken } = await params;

  return (
    <PlaceholderPage
      eyebrow={`Invite ${inviteToken}`}
      title="Photo Contributions"
      description="This placeholder keeps the App Router path ready for photo uploads."
    />
  );
}
