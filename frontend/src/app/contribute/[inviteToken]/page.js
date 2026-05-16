import PlaceholderPage from "@/components/placeholders/PlaceholderPage.jsx";

export default async function ContributePage({ params }) {
  const { inviteToken } = await params;

  return (
    <PlaceholderPage
      eyebrow={`Invite ${inviteToken}`}
      title="Contributor Welcome"
      description="This contributor entry route is in place for the upcoming contribution flow."
    />
  );
}
