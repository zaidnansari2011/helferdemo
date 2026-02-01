"use client";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSession, authClient, getSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";



export default function SellerPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const { data: session, isPending: sessionLoading, refetch: refetchSession } = useSession();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user && !sessionLoading) {
      setIsLoading(true);
      router.push("/seller");
    }
  }, [session, sessionLoading, router]);

  const handleSendOTP = async () => {
    if (!phoneNumber) return;

    setIsLoading(true);

    try {
      const response = await authClient.phoneNumber.sendOtp({
        phoneNumber: phoneNumber,
      });

      if (response.error) {
        alert(response.error?.message);
      } else {
        setStep("otp");
      }
    } catch (error) {
      alert("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) return;

    setIsLoading(true);

    try {
      const response = await authClient.phoneNumber.verify({
        phoneNumber: phoneNumber,
        code: otp,
      });

      console.log('OTP Verification Response:', JSON.stringify(response, null, 2));

      // Check if verification was successful (no error means success)
      if (response.error) {
        alert(response.error.message || "Invalid OTP. Please try again.");
        setIsLoading(false);
        return;
      }

      // Verification successful - session should be created automatically
      // Close modal
      setIsModalOpen(false);
      
      // Force refetch the session from the server
      await refetchSession();
      
      // Small delay to ensure session is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Now redirect
      router.push("/seller");
    } catch (error) {
      console.error("OTP verification error:", error);
      alert("Failed to verify OTP. Please try again.");
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("email");
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
                  src="/hero.svg"
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
                  {step === "email" ? "Log in" : "Verify OTP"}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {step === "email" ? (
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
                      Enter the 6-digit OTP sent to
                    </p>
                    <p className="text-sm font-medium">{phoneNumber}</p>
                  </div>

                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
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
                    Change Email
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
