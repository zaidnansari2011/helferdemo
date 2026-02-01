import { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import { AppRouter } from "../../../backend/server/routers/routes"

// Infer types from TRPC backend
type RouterInputs = inferRouterInputs<AppRouter>
type RouterOutputs = inferRouterOutputs<AppRouter>

// GST verification response from new API
export type GSTVerificationData = {
  success: boolean
  gstin: string
  legalName: string
  tradeName?: string
  registrationDate: string
  status: string
  businessType: string
  address?: string
  addresses?: Array<{ id: string; formattedAddress: string }>
}

// Extract the createSeller input type from backend
export type OnboardingFormData = RouterInputs["seller"]["createSeller"]

// Individual step data types (extracted from the main form data)
export type BusinessDetailsData = OnboardingFormData["businessDetails"]
export type SellerDetailsData = {
  gstNumber: string
}
export type BrandDetailsData = OnboardingFormData["brandDetails"]
export type BankDetailsData = OnboardingFormData["bankDetails"]
export type DigitalSignatureData = OnboardingFormData["digitalSignature"]
export type ShippingLocationsData = OnboardingFormData["shippingLocations"]

export interface StepComponentProps {
  onNext: () => void
  onBack?: () => void
} 