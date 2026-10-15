import { B612, B612_Mono } from "next/font/google";
import "./globals.css";

// B612 was designed by Airbus for cockpit displays: legible at a glance, made for avionics.
const b612 = B612({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-b612" });
const b612Mono = B612_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-b612-mono" });

export const metadata = {
  title: "GTA W Flight Instruments",
  description: "Radio calls, airport charts and live radar for pilot roleplay on GTA World and GTA World France.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${b612.variable} ${b612Mono.variable} font-avsans antialiased`}>{children}</body>
    </html>
  );
}
