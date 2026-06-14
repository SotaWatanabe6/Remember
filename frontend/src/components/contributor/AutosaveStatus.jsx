// frontend/src/components/contributor/AutosaveStatus.jsx

export default function AutosaveStatus({ status }) {
  const statusCopy = {
    idle: "",
    saving: "Saving...",
    saved: "Saved",
    rate_limited: "Saving paused briefly. Wait a moment, then continue to the next question.",
    error: "Could not save. We'll try again when you continue.",
  };

  const text = statusCopy[status] ?? "";
  const isError = status === "error";

  return (
    <p className={`min-h-5 text-caption ${isError ? "text-r-danger" : "text-r-muted"}`} aria-live="polite">
      {text}
    </p>
  );
}
