import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

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
      <body className="min-h-screen antialiased">
        <Providers>
          <Navbar />
          <main className="pb-16">{children}</main>
          <footer className="border-t border-gray-200 bg-white py-8">
            <div className="page-container flex flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--navy)]">PROFINDER</span>
                <span>· Minimalist & Tech-Forward</span>
              </div>
              <p>AI University & Professor Discovery Platform</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
