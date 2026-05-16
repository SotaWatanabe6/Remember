import PlaceholderPage from "@/components/placeholders/PlaceholderPage.jsx";

export default async function MemorialOutputPage({ params }) {
  const { id } = await params;

  return (
    <PlaceholderPage
      eyebrow={`Memorial ${id}`}
      title="Memorial Output"
      description="This output route is reserved for generated memorial experiences."
    />
  );
}
