export default function AutosaveStatus({ status }) {
  const statusCopy = {
    idle: "",
    saving: "Saving...",
    saved: "Saved",
    error: "Could not save. We'll try again when you continue.",
  };

  const text = statusCopy[status] ?? "";

  return (
    <p className="min-h-6 text-sm leading-6 text-slate-500" aria-live="polite">
      {text}
    </p>
  );
}
