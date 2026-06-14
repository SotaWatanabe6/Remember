const iconClassName = "size-6";

function UploadIcon() {
  return (
    <svg
      className={iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 15v4h14v-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className={iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className={iconClassName}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

const icons = {
  upload: UploadIcon,
  users: UsersIcon,
  shield: ShieldIcon,
};

export default function LandingFeatureCard({ title, body, icon, iconTone }) {
  const Icon = icons[icon];

  return (
    <article className="h-auto min-h-[269px] w-full rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-auth sm:h-[269px] sm:w-80">
      <div className={`flex size-12 items-center justify-center rounded-full ${iconTone}`}>
        <Icon />
      </div>
      <h2 className="mt-4 text-xl font-medium leading-7 text-neutral-950">{title}</h2>
      <p className="mt-4 text-base leading-6 text-slate-600">{body}</p>
    </article>
  );
}
