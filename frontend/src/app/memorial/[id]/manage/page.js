import PlaceholderPage from "@/components/placeholders/PlaceholderPage.jsx";

export default async function MemorialManagePage({ params }) {
  const { id } = await params;

  return (
    <PlaceholderPage
      eyebrow={`Memorial ${id}`}
      title="Memorial Management"
      description="This organizer management route is reserved for the next frontend branch."
    />
  );
}
