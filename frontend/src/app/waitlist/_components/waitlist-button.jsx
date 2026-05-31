export default function WaitlistButton({ children, ...props }) {
  return (
    <button
      className="bg-(--shape-fill) text-white font-medium h-10 w-[134px] rounded-sm drop-shadow-[0px_1px_2px_rgba(0,0,0,0.3),0px_2px_6px_rgba(0,0,0,0.15)]"
      onClick={props.onClick}
    >
      {children}
    </button>
  );
}
