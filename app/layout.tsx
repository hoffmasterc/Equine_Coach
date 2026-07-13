import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FormSeat — Equestrian Position Analysis",
  description:
    "Upload a side-on photo and get instant, standards-referenced feedback on your eventing position.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
