import { Shield, Upload, UsersRound } from "lucide-react";

const icons = {
  upload: Upload,
  users: UsersRound,
  shield: Shield,
};

export default function LandingFeatureCard({ title, body, icon, iconTone }) {
  const Icon = icons[icon];

  return (
    <article className="h-auto min-h-[269px] w-full rounded-2xl border border-r-muted bg-r-modal p-8 sm:h-[269px] sm:w-80">
      <div className={`flex size-12 items-center justify-center rounded-full ${iconTone}`}>
        <Icon aria-hidden="true" className="size-6" strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-[20px] font-normal leading-[1.4] text-r-secondary">{title}</h2>
      <p className="mt-4 text-base font-normal leading-[1.25] text-r-text">{body}</p>
    </article>
  );
}
