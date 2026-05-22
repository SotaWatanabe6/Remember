import "./globals.css";

export const metadata = {
  title: "Remember",
  description: "Preserve loved ones' memories together.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col p-(--page-pad-x) ">
        {children}
      </body>
    </html>
  );
}
