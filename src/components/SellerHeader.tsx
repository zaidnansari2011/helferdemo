"use client";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  
  // DEMO MODE: Always approved
  const isApproved = true;

  const handleSignOut = () => {
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white backdrop-blur supports-[backdrop-filter]:bg-white/95 shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <Link href="/seller" className="flex items-center">
          <Image 
            src="/Helferlogo.png" 
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
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-red text-white shadow-md"
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
                  Demo Seller
                </span>
                <span className="text-xs text-gray-500">
                  demo@helfer.com
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
