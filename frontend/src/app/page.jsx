import LandingFeatureGrid from "@/components/landing/LandingFeatureGrid.jsx";
import LandingHero from "@/components/landing/LandingHero.jsx";
import LandingNav from "@/components/landing/LandingNav.jsx";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#F2ECE4] px-6 py-10 text-neutral-950 sm:px-[50px] sm:py-[50px] ">
      <div className="mx-auto flex w-full max-w-[1340px] flex-col items-center gap-[72px] sm:gap-[100px] ">
        <LandingNav />
        <LandingHero />
        <LandingFeatureGrid />
      </div>
    </main>
  );
}
