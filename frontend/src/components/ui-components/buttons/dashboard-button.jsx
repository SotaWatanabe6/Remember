export default function DashboardButton({
  text,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      className={`flex h-[67px] w-[207px] items-center justify-center rounded-full bg-(--button-color) text-[20px] font-bold leading-[30px] text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 ${className}`}
    >
      {text}
    </button>
  );
}
