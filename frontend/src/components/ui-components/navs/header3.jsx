import HeaderBrand from "./header-brand";

export default function Header3() {
  return (
    <header className="flex justify-between items-center font-(--font-family-body) w-full max-w-[1340px] mx-auto">
      <HeaderBrand />
      <div>
        <button className="flex gap-2 text-[16px] leading-[24px] font-medium line">
          Log In/Sign Up
        </button>
      </div>
    </header>
  );
}
