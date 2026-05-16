export default function AuthButton({ children, isLoading = false, ...buttonProps }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="flex h-[71px] w-full items-center justify-center rounded-full bg-neutral-950 px-6 text-[20px] font-medium leading-[30px] text-white transition hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:bg-neutral-500"
      {...buttonProps}
    >
      {isLoading ? "Please wait..." : children}
    </button>
  );
}
