"use client";
import { TRPCProvider, trpcClient } from "@/lib/trpc-provider";
import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SellerHeader } from "@/components/SellerHeader";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if user is on onboarding page
  const isOnboardingPage = pathname === "/seller/onboarding";

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/");
    }
  }, [session, sessionLoading, router]);

  // Verify seller role - allow new users to access onboarding
  const [roleCheckComplete, setRoleCheckComplete] = useState(false);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    const checkSellerRole = async () => {
      if (session?.user && !sessionLoading) {
        try {
          // Use tRPC client to verify seller access
          const accessCheck = await trpcClient.seller.verifySellerAccess.query();

          if (!accessCheck.isSeller) {
            // User has no seller profile yet
            if (accessCheck.role === "ADMIN") {
              // Admin trying to access seller area - sign them out
              console.warn('Admin user attempted to access seller dashboard');
              await authClient.signOut();
              router.push('/');
              return;
            }
            
            // New user without profile - redirect to onboarding
            if (!isOnboardingPage) {
              router.push('/seller/onboarding');
            }
            setRoleCheckComplete(true);
            return;
          }
          
          // User is a seller
          setIsSeller(true);
          setRoleCheckComplete(true);
        } catch (error) {
          console.error('Failed to verify seller access:', error);
          // On error, allow access to onboarding for new users
          if (isOnboardingPage) {
            setRoleCheckComplete(true);
          } else {
            router.push('/seller/onboarding');
          }
        }
      }
    };
    
    checkSellerRole();
  }, [session, sessionLoading, router, isOnboardingPage]);

  // Show loading while checking session or seller role
  if (sessionLoading || !roleCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">
          {sessionLoading ? "Loading..." : "Verifying access..."}
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!session?.user) {
    return null;
  }

  return (
    <TRPCProvider>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Show header for sellers and on onboarding page */}
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