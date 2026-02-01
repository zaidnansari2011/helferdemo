"use client";
import { TRPCProvider } from "@/lib/trpc-provider";
import { usePathname } from "next/navigation";
import { SellerHeader } from "@/components/SellerHeader";

// DEMO MODE: Skip all auth checks
export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboardingPage = pathname === "/seller/onboarding";

  return (
    <TRPCProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <SellerHeader />
        <main className="flex-1">
          <div className={!isOnboardingPage ? "p-6" : ""}>
            {children}
          </div>
        </main>
      </div>
    </TRPCProvider>
  );
}