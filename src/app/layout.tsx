import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rosmini Election Portal | Rosmini Secondary School Tanga",
  description: "A secure student leadership voting portal for Rosmini Secondary School, Tanga, Tanzania.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
  <html lang="en">
    <body className="bg-slate-100 text-slate-900 antialiased">
      <link rel="preload" as="image" href="/school-vote.webp" />
      {children}
    </body>
  </html>
  );
}
