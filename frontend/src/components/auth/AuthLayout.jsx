import AuthLogo from "./AuthLogo.jsx";
import AuthNav from "./AuthNav.jsx";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen bg-r-bg px-6 py-10 text-neutral-950 sm:px-[50px] sm:py-[50px]">
      <div className="mx-auto flex w-full max-w-[1340px] flex-col items-center gap-[72px] sm:gap-[100px]">
        <AuthNav />

        <section className="flex w-full max-w-[434px] flex-col items-center">
          <div className="flex w-full flex-col items-center gap-5 text-center">
            <AuthLogo />
            <div className="flex w-full flex-col items-center gap-5">
              <h1 className="text-[34px] font-medium leading-none tracking-normal text-neutral-950 sm:text-[40px]">
                {title}
              </h1>
              <p className="text-[18px] leading-none text-slate-600 sm:text-[20px]">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="mt-[70px] w-full">{children}</div>

          {footer ? (
            <div className="mt-[28px] text-center text-xl leading-normal text-black sm:text-2xl">
              {footer}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
