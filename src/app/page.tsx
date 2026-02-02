"use client";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";


export default function SellerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // DEMO MODE: Instant access without OTP
  const handleStartSelling = async () => {
    if (!phoneNumber) return;
    setIsLoading(true);
    // Just redirect - backend will handle demo user in DEMO_MODE
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsModalOpen(false);
    router.push("/seller/onboarding");
  };



  return (
    <>
      {/* Full-screen loading overlay during redirect */}
      {isLoading && !isModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-700 font-medium">Logging you in...</p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        {/* red gradient */}
        <div className="bg-gradient-to-br from-[#F66C6C] to-[#DD2929] px-4 py-16 h-screen flex items-center">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl font-semibold text-white leading-tight">
                Your Products.
                <br />
                Delivered
                <br />
                in minutes.
              </h1>
              <p className="text-lg text-white max-w-md">
                Join Helfer and reach millions of customers. Start selling your
                products with India's No. 1 delivery platform.
              </p>
              <Button
                size="lg"
                className="bg-white text-black hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
                onClick={() => setIsModalOpen(true)}
              >
                Start Selling
              </Button>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-xl">
                <Image
                  src="/hero1.svg"
                  alt="Delivery person on scooter"
                  className="object-contain"
                  width={500}
                  height={500}
                />
              </div>
            </div>
          </div>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">seller hub</h2>
                <DialogTitle className="text-xl">Get Started</DialogTitle>
                <p className="text-sm text-gray-600">Demo Mode - No OTP Required</p>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                type="tel"
                placeholder="Enter phone number *"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />

              <Button
                onClick={handleStartSelling}
                disabled={!phoneNumber || isLoading}
                className="w-full"
              >
                {isLoading ? "Loading..." : "Start Selling"}
              </Button>

              <p className="text-xs text-center text-gray-600">
                By continuing, I agree to the{" "}
                <a href="#" className="text-green-600 hover:underline">
                  Terms of Use
                </a>
                {" & "}
                <a href="#" className="text-green-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
