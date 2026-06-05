export default function DashboardButton({
  text,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      className={`flex h-[67px] w-[207px] items-center justify-center rounded-full bg-r-btn text-[20px] font-bold leading-[30px] text-r-btn-text transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus ${className}`}
    >
      {text}
    </button>
  );
}
