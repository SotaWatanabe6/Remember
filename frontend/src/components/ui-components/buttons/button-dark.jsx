export default function ButtonDark(props) {
  return (
    <button className="w-[434px] h-[67px] bg-(--button-color) text-white rounded-full">
      {props.text}
    </button>
  );
}
