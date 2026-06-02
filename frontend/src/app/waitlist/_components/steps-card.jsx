export default function StepsCard(props) {
  return (
    <article className="w-[302px] flex flex-col gap-2">
      <p className="text-[12px] text-[#6C7C5B] tracking-[0.1px] font-family-display font-bold ">
        {props.number}
      </p>
      <p className="font-[200] text-[16px]">{props.description}</p>
    </article>
  );
}
