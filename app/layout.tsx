import type { Metadata } from "next";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import { QuoteModalProvider } from "@/components/QuoteModal";
import Footer from "@/components/Footer";
import { getAxessiaLegalDetails } from "@/lib/axessia-legal";
import { getPortalCustomer } from "@/lib/customer-access";
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
  icons: {
    icon: [
      { url: "/images/favicon/favicon.ico" },
      { url: "/images/favicon/favicon.svg", type: "image/svg+xml" },
      {
        url: "/images/favicon/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/images/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/images/favicon/favicon.ico"],
  },
  manifest: "/images/favicon/site.webmanifest",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const customer = await getPortalCustomer();
  const accountContact = customer
    ? {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        rut: customer.rut,
        city: customer.city,
      }
    : null;

  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--text)]">
          <QuoteModalProvider accountContact={accountContact}>
            <Navbar isCustomerLoggedIn={Boolean(customer)} />
            {children}
            <Footer legalRut={getAxessiaLegalDetails()?.legalRut} />
          </QuoteModalProvider>
      </body>
    </html>
  );
}
