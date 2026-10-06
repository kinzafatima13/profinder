import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import { SITE } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "ProFinder — Find Universities, Professors & Research Opportunities",
    template: "%s | ProFinder",
  },
  description: "Find Chinese universities, professors, and research areas. Compare what is stored, then track an application.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ProFinder",
    url: SITE,
    title: "ProFinder — Find Universities, Professors & Research Opportunities",
    description: "Find Chinese universities, professors, and research areas. Compare what is stored, then track an application.",
  },
  twitter: {
    card: "summary",
    title: "ProFinder — Find Universities, Professors & Research Opportunities",
    description: "Find Chinese universities, professors, and research areas.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-white text-[var(--gray-900)] antialiased`}>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <footer className="mt-16 border-t border-[var(--gray-200)] py-8">
            <div className="page-container flex flex-col items-start justify-between gap-3 text-sm text-[var(--gray-500)] sm:flex-row sm:items-center">
              <p><span className="font-medium text-[var(--navy)]">ProFinder</span></p>
              <nav className="flex flex-wrap gap-3" aria-label="Footer">
                <Link href="/universities">Universities</Link>
                <Link href="/professors">Professors</Link>
                <Link href="/research-areas">Research areas</Link>
                <Link href="/scholarship">Scholarships</Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
