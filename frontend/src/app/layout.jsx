import "./globals.css";
import Header1 from "./components/navs/header-1";

export const metadata = {
  title: "Remember",
  description: "Preserve loved ones' memories together.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
