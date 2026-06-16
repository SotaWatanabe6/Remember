import LandingFeatureCard from "./LandingFeatureCard.jsx";

const features = [
  {
    title: "Gather Memories",
    body: "Invite family and friends to contribute photos, videos, audio recordings, and written memories.",
    icon: "upload",
    iconTone: "bg-[#C9DCE4] text-r-accent",
  },
  {
    title: "Curate Together",
    body: "Review and organize contributions from everyone who knew them. Build a complete picture of their life.",
    icon: "users",
    iconTone: "bg-[#EDCDC2] text-r-family",
  },
  {
    title: "Private & Safe",
    body: "Your memorial is private and invitation-only. AI helps flag any inappropriate content.",
    icon: "shield",
    iconTone: "bg-[#B7C19A] text-r-shape",
  },
];

export default function LandingFeatureGrid() {
  return (
    <section className="w-full" aria-label="Remember features">
      <div className="mx-auto grid w-full max-w-[1088px] grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {features.map((feature) => (
          <LandingFeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
