import "./globals.css";

export const metadata = {
  title: "Remember",
  description: "Remember frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
