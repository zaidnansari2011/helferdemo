"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StepComponentProps, OnboardingFormData } from "@/types/onboarding"
import { CheckCircle, Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc-provider"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

interface VerifySubmitStepProps extends StepComponentProps {
  allData: OnboardingFormData
}

export default function VerifySubmitStep({ onBack, allData }: VerifySubmitStepProps) {
  const [submitError, setSubmitError] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const router = useRouter()

  const createSellerMutation = useMutation(trpc.seller.createSeller.mutationOptions())
  const { data: gstData, isLoading: gstDataLoading } = useQuery(
    trpc.seller.getGST.queryOptions({
      gstNumber: allData.sellerDetails.gstNumber
    })
  )

  const handleSubmit = async () => {
    setSubmitError("")
    
    try {
      const result = await createSellerMutation.mutateAsync(allData)
      setIsSubmitted(true)
      
      // Refresh session to get updated email
      await authClient.session.getSession({ fetchOptions: { cache: 'no-cache' } })
      
      // Show success message for a moment, then redirect to pending review page
      setTimeout(() => {
        router.push('/seller/pending')
      }, 2000)
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit application. Please try again."
      setSubmitError(errorMessage)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-green-600 mb-2">Application Submitted Successfully!</h2>
        <p className="text-gray-600 mb-4">
          Your seller onboarding application has been submitted for review. 
          Our team will verify your details within 2-3 business days.
        </p>
        <p className="text-sm text-gray-500">Redirecting to application status page...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Verify and submit</h2>
        <p className="text-sm text-gray-600">
          Please review your information before submitting your onboarding application
        </p>
      </div>

      <div className="space-y-6">
        {/* Business Details Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Contact Name:</span>
                <p className="font-medium">{allData.businessDetails.contactName || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium">{allData.businessDetails.officialEmail || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">Categories:</span>
                <p className="font-medium">{allData.businessDetails.topCategories?.join(', ') || 'None selected'}</p>
              </div>
              <div>
                <span className="text-gray-600">Mobile:</span>
                <p className="font-medium">
                  {allData.businessDetails.countryCode} {allData.businessDetails.mobileNumber}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST Details Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              GST Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="text-gray-600">GST Number:</span>
              <p className="font-medium">{allData.sellerDetails.gstNumber || 'Not provided'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Brand Details Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Brand Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Brand Name:</span>
                <p className="font-medium">{allData.brandDetails.brandName || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">Manufacturer:</span>
                <p className="font-medium">{allData.brandDetails.manufacturerName || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">Trademark Number:</span>
                <p className="font-medium">{allData.brandDetails.trademarkNumber || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">Documents:</span>
                <p className="font-medium">
                  {allData.brandDetails.trademarkAuthDocumentUrl ? '✓ Trademark Authorization uploaded' : 'Not uploaded'}
                  {allData.brandDetails.sellerAuthDocumentUrl ? ', ✓ Seller Authorization uploaded' : ', Seller Authorization not uploaded'}
                  {allData.brandDetails.brandLogoUrl ? ', ✓ Logo uploaded' : ', Logo not uploaded'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Account Number:</span>
                <p className="font-medium">
                  {allData.bankDetails.bankAccountNumber ? 
                    `****${allData.bankDetails.bankAccountNumber.slice(-4)}` : 
                    'Not provided'
                  }
                </p>
              </div>
              <div>
                <span className="text-gray-600">IFSC Code:</span>
                <p className="font-medium">{allData.bankDetails.ifscCode || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-gray-600">Bank Type:</span>
                <p className="font-medium">{allData.bankDetails.bankType || 'Not provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digital Signature Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Digital Signature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="text-gray-600">Status:</span>
              <p className="font-medium">
                {allData.digitalSignature.signature ? '✓ Signature provided' : 'Not provided'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Locations Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Shipping Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-gray-600">Selected Address:</span>
                <p className="font-medium">{ gstData?.addresses.find(addr => addr.id === allData.shippingLocations.selectedAddressId)?.formattedAddress || 'Not provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {submitError && (
        <div className="bg-brand-red-light border border-brand-red/20 rounded-lg p-4">
          <p className="text-brand-red text-sm">{submitError}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button 
          type="button"
          variant="outline"
          onClick={onBack}
          className="px-8 py-2"
          disabled={createSellerMutation.isPending}
        >
          Back
        </Button>
        <Button 
          type="button"
          onClick={handleSubmit}
          disabled={createSellerMutation.isPending}
          className="px-8 py-2"
        >
          {createSellerMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>
    </div>
  )
} 