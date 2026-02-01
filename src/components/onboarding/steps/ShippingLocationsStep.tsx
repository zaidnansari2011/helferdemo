"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShippingLocationsData, StepComponentProps, OnboardingFormData } from "@/types/onboarding"
import { trpc, trpcClient } from "@/lib/trpc-provider"
import { useQuery } from "@tanstack/react-query"

interface ShippingLocationsStepProps extends StepComponentProps {
  data: ShippingLocationsData
  updateData: (data: ShippingLocationsData) => void
  fullFormData: OnboardingFormData
}
export default function ShippingLocationsStep({ onNext, onBack, data, updateData, fullFormData }: ShippingLocationsStepProps) {
  const { handleSubmit, setValue, watch } = useForm<ShippingLocationsData>({
    defaultValues: data
  })

  const selectedAddressId = watch('selectedAddressId')
  const isMainAddress = watch('isMainAddress')

  const { data: gstData, isLoading: gstDataLoading } = useQuery(
    trpc.seller.getGST.queryOptions({
      gstNumber: fullFormData.sellerDetails.gstNumber
    })
  )

  // Extract addresses from GST data
  const addresses = gstData?.addresses || []

  const onSubmit = (formData: ShippingLocationsData) => {
    // Find the selected address to populate country, region, and address fields
    const selectedAddress = addresses.find(addr => addr.id === formData.selectedAddressId)
    
    if (selectedAddress) {
      const updatedData: ShippingLocationsData = {
        ...formData,
      }
      updateData(updatedData)
    } else {
      updateData(formData)
    }
    
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Shipping locations</h2>
        <p className="text-sm text-gray-600">
          Select the address from your GST registration for shipping your products
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-5">
          {/* GST Number Display */}
          <div>
            <div className="text-sm text-gray-600 mb-2">GST number</div>
            <div className="text-sm font-medium bg-gray-50 p-3 rounded-lg border border-gray-200">
              {fullFormData.sellerDetails.gstNumber || 'Not provided'}
            </div>
          </div>

          {/* Address Selection */}
          <div>
            <div className="text-sm text-gray-600 mb-2">Select shipping address from your GST registration</div>
            {gstDataLoading ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Loading addresses...</p>
              </div>
            ) : addresses.length > 0 ? (
              <Select 
                onValueChange={(value) => {
                  setValue('selectedAddressId', value)
                  setValue('isMainAddress', value === 'principal')
                }} 
                defaultValue={selectedAddressId}
              >
                <SelectTrigger className="w-full max-w-full overflow-hidden">
                  <SelectValue placeholder="Select address from your GST registration" className="truncate" />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)] w-full">
                  {addresses.map((address) => (
                    <SelectItem 
                      key={address.id} 
                      value={address.id} 
                      className="text-sm leading-relaxed whitespace-normal break-words max-w-full"
                    >
                      <div className="max-w-full overflow-hidden">
                        {address.formattedAddress}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  No addresses found. Please verify your GST number in the previous step.
                </p>
              </div>
            )}
          </div>

          {/* Show selected address details */}
          {selectedAddressId && addresses.length > 0 && (
            <div className="bg-brand-navy-light border border-brand-navy/20 rounded-lg p-4">
              <div className="text-sm">
                <div className="font-medium text-brand-navy-dark mb-1">Selected Address:</div>
                <div className="text-brand-navy">
                  {addresses.find(addr => addr.id === selectedAddressId)?.formattedAddress}
                </div>
                {isMainAddress && (
                  <div className="text-brand-navy text-xs mt-1">✓ Principal/Main Address</div>
                )}
              </div>
            </div>
          )}

          {/* Info Boxes */}
          {/* <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              Our delivery partner will be assigned to you for easy onboarding
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              The delivery partner may reach out to you to verify the pickup location and provide the details about their service.
            </p>
          </div> */}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end gap-4 pt-6">
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
            className="px-8 py-2"
            disabled={!selectedAddressId}
          >
            Save & continue
          </Button>
        </div>
      </form>
    </div>
  )
}