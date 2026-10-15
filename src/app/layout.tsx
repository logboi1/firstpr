import type { Metadata } from "next";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: "FirstPR — Your first contribution starts here",
  icons: { icon: [{ url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" }, { url: "/brand/firstpr-mark.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
  applicationName: "FirstPR",
  description:
    "An open-source project helping newcomers find contribution opportunities, follow practical guidance, and get mentor support. Currently in development.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
