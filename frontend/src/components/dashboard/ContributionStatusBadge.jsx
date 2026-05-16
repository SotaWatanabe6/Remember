const statusStyles = {
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Pending review": "border-amber-200 bg-amber-50 text-amber-800",
  Rejected: "border-stone-200 bg-stone-100 text-stone-700",
  Clear: "border-slate-200 bg-slate-50 text-slate-700",
  "Needs review": "border-rose-200 bg-rose-50 text-rose-800",
  "Sensitive detail": "border-rose-200 bg-rose-50 text-rose-800",
};

export default function ContributionStatusBadge({ children, tone }) {
  const label = children || "Pending review";
  const classes = tone ? statusStyles[tone] : statusStyles[label];

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium leading-4 ${
        classes || "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}
