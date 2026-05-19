import "./globals.css";
import Header1 from "./components/navs/header-1";

export const metadata = {
  title: "Remember",
  description: "Remember frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="p-(--page-pad-x) text-(--text-color-1)">
        <Header1 />
        <main className="">{children}</main>
      </body>
    </html>
  );
}
