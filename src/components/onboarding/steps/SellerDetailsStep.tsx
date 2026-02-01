"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { Label } from "@/components/ui/label"
import { SellerDetailsData, StepComponentProps, GSTVerificationData } from "@/types/onboarding"
import { useState } from "react"
import { trpcClient } from "@/lib/trpc-provider"
import { Loader2 } from "lucide-react"

interface SellerDetailsStepProps extends StepComponentProps {
  data: SellerDetailsData
  updateData: (data: SellerDetailsData) => void
}

export default function SellerDetailsStep({ onNext, onBack, data, updateData }: SellerDetailsStepProps) {
  const [isGstVerified, setIsGstVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [gstData, setGstData] = useState<GSTVerificationData | null>(null)
  const [verificationError, setVerificationError] = useState("")
  
  const { handleSubmit, formState: { errors }, control, watch, setValue } = useForm<SellerDetailsData>({
    defaultValues: data
  })

  const gstNumber = watch("gstNumber", data.gstNumber)

  const onSubmit = (formData: SellerDetailsData) => {
    // Preserve the gstVerificationData that was set during verification
    updateData({
      ...formData,
      gstNumber
    })
    onNext()
  }

  const handleGstVerification = async () => {
    if (!gstNumber) {
      setVerificationError("Please enter a GST number")
      return
    }

    setVerificationError("")
    setIsVerifying(true)
    
    try {
      const result = await trpcClient.seller.getGST.query({
        gstNumber: gstNumber
      })
      if (result?.success) {
        setGstData(result)
        setIsGstVerified(true)
      } else {
        setVerificationError("GST verification failed. Please enter a different GST number.")
        setIsGstVerified(false)
        setGstData(null)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "GST verification failed. Please enter a different GST number."
      setVerificationError(errorMessage)
      setIsGstVerified(false)
      setGstData(null)
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">GST details</h2>
        <p className="text-sm text-gray-600">Enter your GST number to verify your business details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <FloatingInput
            label="Enter GST number *"
            name="gstNumber"
            value={watch('gstNumber') || ''}
            onChange={(e) => setValue('gstNumber', e.target.value)}
            error={errors.gstNumber?.message || verificationError}
            required
          />
        </div>

        <div>
          <p className="text-sm text-gray-600 mb-4">Details linked to your GST will be shown below after verification</p>
          
          {/* GST Details Table */}
          {gstData?.success && (
            <div className="border-2 border-dashed rounded-lg p-6 border-brand-navy bg-brand-navy-light/50">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 font-medium">Business Name:</span>
                    <div className="font-semibold mt-1 text-gray-900">{gstData.businessName || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Constitution:</span>
                    <div className="font-semibold mt-1 text-gray-900">{gstData.constitution || 'N/A'}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 font-medium">Business Type:</span>
                    <div className="font-semibold mt-1 text-gray-900">{gstData.businessType || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Status:</span>
                    <div className="font-semibold mt-1">
                      <span className="text-brand-navy font-bold">✓ Verified</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-600 font-medium">Principal Address:</span>
                  <div className="font-semibold mt-1 text-gray-900">
                    {gstData.addresses.find(addr => addr.id === 'principal')?.formattedAddress || 'N/A'}
                  </div>
                </div>
                
                {gstData.addresses.length > 1 && (
                  <div>
                    <span className="text-gray-600 font-medium">Total Addresses:</span>
                    <div className="font-semibold mt-1 text-gray-900">{gstData.addresses.length} address(es) found</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-4">
            By clicking "Verify GST details" you agree that this GST belongs to you
          </p>

          <div className="mt-6">
            <Button
              type="button"
              onClick={handleGstVerification}
              className="bg-green-100 hover:bg-green-200 text-green-700 border border-green-300"
              disabled={isGstVerified || !gstNumber || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : isGstVerified ? (
                "GST Verified ✓"
              ) : (
                "Verify GST details"
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button 
            type="button"
            variant="outline"
            onClick={onBack}
            className="px-8 py-2"
          >
            Back
          </Button>
          <Button 
            type="submit"
            disabled={!isGstVerified}
            className="px-8 py-2"
          >
            Save & continue
          </Button>
        </div>
      </form>
    </div>
  )
} 