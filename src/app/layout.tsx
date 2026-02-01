import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc-provider";
import { Toaster } from "@/components/ui/sonner";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Seller Hub - Blinkit",
  description: "Join Blinkit as a seller and reach millions of customers with fast delivery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${prompt.variable} antialiased`}
      >
        <TRPCProvider>
          {children}
        </TRPCProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
