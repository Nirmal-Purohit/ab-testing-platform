import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ExperimentLab — A/B Testing Platform",
  description:
    "Statistical experimentation platform: design experiments, analyse results, monitor sequential tests.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-600">
          ExperimentLab · Statistical Experimentation Platform · Built with
          FastAPI + Next.js
        </footer>
      </body>
    </html>
  );
}
