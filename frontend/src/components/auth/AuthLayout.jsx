import AuthLogo from "./AuthLogo.jsx";
import AuthNav from "./AuthNav.jsx";

export default function AuthLayout({ title, subtitle, children, footer, variant = "login" }) {
  const isSignup = variant === "signup";

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-neutral-950 sm:px-[50px] sm:pt-[50px]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1340px] flex-col items-center">
        <AuthNav />

        <section
          className={`flex w-full max-w-[508px] flex-1 flex-col items-center ${
            isSignup ? "pt-[29px] sm:pt-[29px]" : "pt-[41px] sm:pt-[41px]"
          }`}
        >
          <div className="flex w-full flex-col items-center gap-5 text-center">
            <AuthLogo />
            <div className="space-y-4">
              <h1 className="text-[34px] font-medium leading-[1.2] tracking-normal text-neutral-950 sm:text-[38px] sm:leading-[46px]">
                {title}
              </h1>
              <p className="text-[18px] leading-[30px] text-slate-600 sm:text-[20px]">
                {subtitle}
              </p>
            </div>
          </div>

          <div
            className={`w-full ${
              isSignup ? "mt-[70px] sm:mt-[73px]" : "mt-[35px] sm:mt-[36px]"
            }`}
          >
            {children}
          </div>

          <div
            className={`text-center text-xl leading-normal text-black sm:text-2xl ${
              isSignup ? "mt-[45px]" : "mt-[28px]"
            }`}
          >
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
