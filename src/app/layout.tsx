import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "PROFINDER — AI University & Professor Discovery",
  description:
    "Discover Chinese universities, programs, research areas, and professors. Match your research interests, personalize outreach, and track applications.",
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
            <div className="page-container flex flex-col items-start justify-between gap-2 text-sm text-[var(--gray-500)] sm:flex-row sm:items-center">
              <p><span className="font-medium text-[var(--navy)]">ProFinder</span> · AI university and professor discovery</p>
              <p>Minimalist and tech-forward</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
