import Image from "next/image";

export default function ProductOutfitCard(props) {
  return (
    <article>
      <Image
        className="h-auto w-full rounded-2xl object-cover shadow-[0px_1px_2px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)]"
        src={props.src}
        width={946}
        height={711}
        alt={props.alt}
      />
      <p className="mt-4 text-base font-light  sm:text-[16px]">
        {props.description}
      </p>
    </article>
  );
}
