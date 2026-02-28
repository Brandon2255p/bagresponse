import type { Metadata } from "next";
import { Bebas_Neue, Oswald } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-bebas",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BAGRESPONSE | Boxing Training Timer",
  description: "High-intensity boxing training with pattern-based audio callouts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bebasNeue.variable} ${oswald.variable} antialiased bg-void text-canvas`}
      >
        {children}
      </body>
    </html>
  );
}
