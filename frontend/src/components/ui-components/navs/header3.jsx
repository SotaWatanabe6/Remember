export default function Header3() {
  return (
    <header className="flex justify-between items-center font-(--font-family-body) w-full max-w-[1340px] mx-auto">
      <div className="logo">
        <p className="text-[24px] text-(--text-color-1) font-normal">
          Remember
        </p>
      </div>
      <div>
        <button className="flex gap-2 text-[16px] leading-[24px] font-medium line">
          Log In/Sign Up
        </button>
      </div>
    </header>
  );
}
