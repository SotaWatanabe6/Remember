import "./globals.css";
import localFont from "next/font/local";

const switzer = localFont({
  src: [
    {
      path: "../../public/fonts/switzer/Switzer-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/switzer/Switzer-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/switzer/Switzer-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/switzer/Switzer-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/switzer/Switzer-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/switzer/Switzer-SemiboldItalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../public/fonts/switzer/Switzer-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/switzer/Switzer-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-switzer",
  display: "swap",
});

const boska = localFont({
  src: [
    {
      path: "../../public/fonts/boska/Boska-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/boska/Boska-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/boska/Boska-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/boska/Boska-MediumItalic.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/boska/Boska-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/boska/Boska-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-boska",
  display: "swap",
});

export const metadata = {
  title: "Remember",
  description: "Preserve loved ones' memories together.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${switzer.variable} ${boska.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col  font-(--font-family-body) bg-[#F2ECE4]">
        {children}
      </body>
    </html>
  );
}
