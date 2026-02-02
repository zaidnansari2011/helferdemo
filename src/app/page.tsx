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
import { toast } from "sonner";


export default function SellerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const router = useRouter();

  // DEMO MODE: Skip to OTP entry (no actual SMS sent)
  const handleSendOTP = async () => {
    if (!phoneNumber) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success("Demo Mode: Use OTP 123456");
    setStep("otp");
    setIsLoading(false);
  };

  // DEMO MODE: Accept OTP 123456
  const handleVerifyOTP = async () => {
    if (!otp) return;
    if (otp !== "123456") {
      toast.error("Invalid OTP. Use 123456 for demo mode.");
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success("Login successful!");
    setIsModalOpen(false);
    router.push("/seller/onboarding");
  };

  const resetFlow = () => {
    setStep("phone");
    setOtp("");
    setPhoneNumber("");
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
                <DialogTitle className="text-xl">
                  {step === "phone" ? "Log in" : "Verify OTP"}
                </DialogTitle>
                {step === "phone" && (
                  <p className="text-sm text-gray-600">Demo Mode - OTP: 123456</p>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {step === "phone" ? (
                <>
                  <Input
                    type="tel"
                    placeholder="Enter phone number *"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isLoading}
                  />

                  <Button
                    onClick={handleSendOTP}
                    disabled={!phoneNumber || isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-gray-600">
                      Enter the 6-digit OTP
                    </p>
                    <p className="text-sm font-medium text-green-600">Demo OTP: 123456</p>
                    <p className="text-xs text-gray-500">{phoneNumber}</p>
                  </div>

                  <Input
                    type="text"
                    placeholder="Enter OTP (123456)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isLoading}
                    maxLength={6}
                  />

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={!otp || isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Verifying..." : "Verify OTP"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={resetFlow}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Change Phone Number
                  </Button>
                </>
              )}

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
