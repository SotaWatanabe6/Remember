import PlaceholderPage from "@/components/placeholders/PlaceholderPage.jsx";

export default async function SharePage({ params }) {
  const { shareToken } = await params;

  return (
    <PlaceholderPage
      eyebrow={`Share ${shareToken}`}
      title="Shared Memorial"
      description="This public sharing route is ready for a future read-only memorial view."
    />
  );
}
