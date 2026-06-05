export default function ButtonDark(props) {
  return (
    <button className="h-[67px] w-[434px] rounded-full bg-r-btn text-r-btn-text transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus">
      {props.text}
    </button>
  );
}
