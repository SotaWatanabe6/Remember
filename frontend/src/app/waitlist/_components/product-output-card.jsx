import Image from "next/image";
export default function ProductOutfitCard(props) {
  return (
    <article>
      {/* <Image
        className="rounded-2xl shadow-[0px_1px_2px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)]  object-cover "
        src="/images/product-output-card.png"
        width={947}
        height={308}
        alt="product output"
      /> */}
      <div
        className="rounded-2xl shadow-[0px_1px_2px_rgba(0,0,0,0.3),0px_1px_3px_1px_rgba(0,0,0,0.15)] h-[308px] w-[947px] bg-[#F2ECE4] object-cover "
        src="/images/product-output-card.png"
        alt="product output"
      ></div>
      <p className="mt-4 text-[18px]">{props.description}</p>
    </article>
  );
}
