"use client";
import { useSession } from "@/lib/auth-client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Package, 
  FileText,
  ClipboardList,
  Receipt,
  Settings, 
  LogOut,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { clearQueryCache, trpcClient } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  {
    href: "/seller",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/seller/products",
    label: "Products",
    icon: Package,
  },
  {
    href: "/seller/proforma-invoices",
    label: "Proforma Invoices",
    icon: FileText,
  },
  {
    href: "/seller/purchase-orders",
    label: "Purchase Orders",
    icon: ClipboardList,
  },
  {
    href: "/seller/invoices",
    label: "Invoices",
    icon: Receipt,
  },
];

export function SellerHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if seller is approved
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (session?.user) {
        setIsLoading(true);
        try {
          const accessCheck = await trpcClient.seller.verifySellerAccess.query();
          setIsApproved(accessCheck.isSeller);
        } catch (error) {
          setIsApproved(false);
        } finally {
          setIsLoading(false);
        }
      }
    };
    checkApprovalStatus();
  }, [session, pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Allow navigation to dashboard and onboarding even if not approved
    if (href === "/seller" || href === "/seller/onboarding" || pathname === href) {
      return;
    }
    
    // Block navigation if not approved
    if (!isApproved && !isLoading) {
      e.preventDefault();
      toast.error("Please complete and submit your onboarding form first", {
        description: "Your application needs to be reviewed before accessing other features."
      });
    }
  };

  const handleSignOut = async () => {
    clearQueryCache();
    await authClient.signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white backdrop-blur supports-[backdrop-filter]:bg-white/95 shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/seller" className="flex items-center">
          <Image 
            src="/helferlogo.png" 
            alt="Helfer Logo" 
            width={300} 
            height={85}
            className="h-12 w-auto"
          />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const isBlocked = !isApproved && !isLoading && item.href !== "/seller" && item.href !== "/seller/onboarding";
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-red text-white shadow-md"
                    : isBlocked
                    ? "text-gray-300 hover:bg-gray-50 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <Link href="/seller/settings">
            <Button variant="ghost" size="icon" className="text-gray-700 hover:bg-gray-100">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-gray-700 hover:bg-gray-100">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">
                  {session?.user?.name || "Seller"}
                </span>
                <span className="text-xs text-gray-500">
                  {session?.user?.email?.endsWith('@temp.blinkit.com') 
                    ? session?.user?.phoneNumber || session?.user?.email.replace('@temp.blinkit.com', '')
                    : session?.user?.email || session?.user?.phoneNumber
                  }
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
