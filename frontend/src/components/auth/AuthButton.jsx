export default function AuthButton({ children, isLoading = false, ...buttonProps }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="flex h-[67px] w-full items-center justify-center rounded-full bg-r-btn px-6 text-[20px] font-normal leading-none text-r-btn-text transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-border-focus disabled:cursor-not-allowed disabled:opacity-60"
      {...buttonProps}
    >
      {isLoading ? "Please wait..." : children}
    </button>
  );
}
