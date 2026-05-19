export default function Header2() {
  return (
    <header className="flex justify-between items-center max-w-[1340px]">
      <div className="logo">
        <p className="text-[24px] text-(--text-color-1) font-normal">
          Remember
        </p>
      </div>
      <div>
        <button className="flex gap-2 text-[16px] leading-[24px] font-medium line">
          <span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M5 12h14M5 12l4-4m-4 4l4 4"
              />
            </svg>
          </span>
          Back
        </button>
      </div>
    </header>
  );
}
