import AuthLogo from "./AuthLogo.jsx";
import AuthNav from "./AuthNav.jsx";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen bg-r-bg px-6 py-10 text-r-text sm:px-[50px] sm:py-[50px]">
      <div className="mx-auto flex w-full max-w-[1340px] flex-col items-center gap-[72px] sm:gap-[100px]">
        <AuthNav />

        <section className="flex w-full max-w-[434px] flex-col items-center">
          <div className="flex w-full flex-col items-center gap-5 text-center">
            <AuthLogo />
            <div className="flex w-full flex-col items-center gap-5">
              <h1 className="font-display text-[40px] font-bold leading-none tracking-normal text-r-text">
                {title}
              </h1>
              <p className="text-[20px] font-normal leading-[1.2] text-r-secondary">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="mt-[70px] w-full sm:mt-[100px]">{children}</div>

          {footer ? (
            <div className="mt-7 text-center text-[20px] font-normal leading-normal text-r-secondary">
              {footer}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
