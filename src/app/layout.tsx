import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FirstPR — Your first contribution starts here",
  description:
    "An open-source project helping newcomers find contribution opportunities, follow practical guidance, and get mentor support. Currently in development.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
