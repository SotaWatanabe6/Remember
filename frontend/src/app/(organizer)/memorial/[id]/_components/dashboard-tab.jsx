export default function DashboardTab({
  text,
  isActive = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-center border-b pb-2 text-center text-h3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 ${
        isActive
          ? "border-b-2 border-[#0A0A0A] font-bold! text-[#0A0A0A]"
          : "border-[#0A0A0A] text-[#0A0A0A]"
      }`}
    >
      {text}
    </button>
  );
}
