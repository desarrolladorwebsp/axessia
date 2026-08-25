import type { Metadata } from "next";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import { QuoteModalProvider } from "@/components/QuoteModal";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AXESSIA | Tecnología y salud con confianza",
  description:
    "AXESSIA conecta tecnología, salud y cercanía para ofrecer soluciones digitales seguras y humanas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--text)]">
          <QuoteModalProvider>
            <Navbar />
            {children}
          </QuoteModalProvider>
      </body>
    </html>
  );
}
