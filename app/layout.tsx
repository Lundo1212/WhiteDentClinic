import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...(process.env.APP_URL ? { metadataBase: new URL(process.env.APP_URL) } : {}),
  title: "White Dental Clinic | Thoughtful Dental Care in Dallas, TX",
  description:
    "Discover thoughtful dental care, explore treatment options, and book a visit with White Dental Clinic in Dallas, Texas.",
  openGraph: {
    type: "website",
    siteName: "White Dental Clinic",
    title: "White Dental Clinic | Thoughtful Dental Care in Dallas, TX",
    description: "Thoughtful dental care, clear answers, and a more comfortable visit at White Dental Clinic in Dallas, Texas.",
  },
  twitter: {
    card: "summary",
    title: "White Dental Clinic | Thoughtful Dental Care in Dallas, TX",
    description: "Thoughtful dental care, clear answers, and a more comfortable visit at White Dental Clinic in Dallas, Texas.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Dentist",
              name: "White Dental Clinic",
              url: process.env.APP_URL,
              description:
                "Thoughtful dental care and appointment bookings in Dallas, Texas.",
              address: {
                "@type": "PostalAddress",
                streetAddress: "2717 Main Street",
                addressLocality: "Dallas",
                addressRegion: "TX",
                postalCode: "75226",
                addressCountry: "US",
              },
              areaServed: {
                "@type": "City",
                name: "Dallas",
              },
            }).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
