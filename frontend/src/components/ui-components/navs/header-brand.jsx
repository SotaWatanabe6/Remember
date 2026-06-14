import Image from "next/image";

export default function HeaderBrand() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/Logo.svg"
        alt="Remember logo"
        width={34}
        height={36}
        className="h-[36px] w-[34px]"
        priority
      />
      <span className="font-family-display text-[24px] font-[500] text-(--text-color-1)">
        Remember
      </span>
    </div>
  );
}
