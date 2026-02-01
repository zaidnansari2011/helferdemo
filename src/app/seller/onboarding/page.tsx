"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { FloatingSelect } from "@/components/ui/FloatingSelect"
import { OnboardingFormData, GSTVerificationData } from "@/types/onboarding"
import { useRouter } from "next/navigation"
import { Loader2, X, CheckCircle, Upload, Download, FileText, ImageIcon, Info, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const categories = [
  "Tools", "Wood work", "Electrical", "Security Systems", "Plumbing", 
  "Safety Equipment", "Painting"
]

export default function SellerOnboardingPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // State
  const [topCategories, setTopCategories] = useState<string[]>([])
  const [gstVerified, setGstVerified] = useState(false)
  const [gstVerifying, setGstVerifying] = useState(false)
  const [gstData, setGstData] = useState<GSTVerificationData | null>(null)
  const [gstError, setGstError] = useState("")
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [authDocUploading, setAuthDocUploading] = useState(false)
  const [sellerAuthUploading, setSellerAuthUploading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsExpanded, setTermsExpanded] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)
  const [bankVerified, setBankVerified] = useState(false)
  const [bankVerifying, setBankVerifying] = useState(false)
  const [bankError, setBankError] = useState("")
  
  // Helper function to preview documents/images
  const previewFile = (dataUrl: string) => {
    // Convert data URL to blob for better preview
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    const blob = new Blob([u8arr], { type: mime })
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank')
  }

  // Demo bank account validation (will be replaced with penny drop later)
  const handleBankValidation = async () => {
    // Basic validation first
    if (!formData.bankDetails.bankAccountNumber) {
      setBankError("Please enter bank account number")
      return
    }
    if (!formData.bankDetails.confirmBankAccountNumber) {
      setBankError("Please confirm bank account number")
      return
    }
    if (formData.bankDetails.bankAccountNumber !== formData.bankDetails.confirmBankAccountNumber) {
      setBankError("Account numbers do not match")
      return
    }
    if (!formData.bankDetails.ifscCode) {
      setBankError("Please enter IFSC code")
      return
    }
    if (!formData.bankDetails.bankType) {
      setBankError("Please select bank type")
      return
    }

    setBankError("")
    setBankVerifying(true)

    // Demo mode: simulate validation with timeout
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setBankVerified(true)
    setBankVerifying(false)
    toast.success("Bank account validated successfully!")
  }
  
  const [validatedSections, setValidatedSections] = useState({
    business: false,
    gst: false,
    brand: false,
    bank: false,
    shipping: false,
    signature: false,
    terms: false
  })
  
  const [formData, setFormData] = useState<OnboardingFormData>({
    businessDetails: {
      topCategories: [],
      retailChannel: "",
      referenceLink: "",
      totalMonthlySales: "",
      socialChannel: "",
      socialMediaLink: "",
      userCount: "",
      contactName: "",
      officialEmail: "",
      designation: "",
      mobileNumber: "",
      countryCode: "+91"
    },
    sellerDetails: {
      gstNumber: "",
    },
    brandDetails: {
      brandName: "",
      manufacturerName: "",
      trademarkNumber: "",
      sellerAuthDocumentUrl: "",
      trademarkAuthDocumentUrl: "",
      brandLogoUrl: ""
    },
    bankDetails: {
      bankAccountNumber: "",
      confirmBankAccountNumber: "",
      ifscCode: "",
      bankType: ""
    },
    digitalSignature: {
      signature: ""
    },
    shippingLocations: {
      isMainAddress: false,
      selectedAddressId: "",
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // DEMO MODE: Mock mutations that just succeed
  const uploadFileMutation = {
    mutateAsync: async (data: { file: string; fileName: string; folder: string }) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { url: `https://demo-storage.example.com/${data.folder}/${data.fileName}` }
    },
    isPending: false
  }
  
  const onboardingMutation = {
    mutateAsync: async (_data: OnboardingFormData) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    isPending: false
  }

  // Setup canvas for signature
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'
  }, [])

  // Auto-validate sections as user fills form
  useEffect(() => {
    // Validate business section
    const businessValid = topCategories.length > 0 && 
      formData.businessDetails.retailChannel &&
      formData.businessDetails.contactName &&
      formData.businessDetails.officialEmail &&
      formData.businessDetails.mobileNumber
    setValidatedSections(prev => ({ ...prev, business: businessValid }))

    // Validate brand section
    const brandValid = formData.brandDetails.brandName &&
      formData.brandDetails.manufacturerName &&
      formData.brandDetails.trademarkAuthDocumentUrl &&
      formData.brandDetails.sellerAuthDocumentUrl
    setValidatedSections(prev => ({ ...prev, brand: brandValid }))

    // Validate shipping section
    const shippingValid = !!formData.shippingLocations.selectedAddressId
    setValidatedSections(prev => ({ ...prev, shipping: shippingValid }))

    // Validate bank section
    const bankValid = formData.bankDetails.bankAccountNumber &&
      formData.bankDetails.confirmBankAccountNumber &&
      formData.bankDetails.bankAccountNumber === formData.bankDetails.confirmBankAccountNumber &&
      formData.bankDetails.ifscCode &&
      /^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode) &&
      formData.bankDetails.bankType
    setValidatedSections(prev => ({ ...prev, bank: bankValid }))

    // Validate signature section
    setValidatedSections(prev => ({ ...prev, signature: hasSignature }))

    // Validate terms section
    setValidatedSections(prev => ({ ...prev, terms: termsAccepted }))
  }, [formData, topCategories, hasSignature, termsAccepted])

  // Handlers
  const handleCategorySelect = (category: string) => {
    if (!topCategories.includes(category) && topCategories.length < 10) {
      const newCategories = [...topCategories, category]
      setTopCategories(newCategories)
      setFormData(prev => ({
        ...prev,
        businessDetails: { ...prev.businessDetails, topCategories: newCategories }
      }))
    }
  }

  const handleCategoryRemove = (category: string) => {
    const newCategories = topCategories.filter(c => c !== category)
    setTopCategories(newCategories)
    setFormData(prev => ({
      ...prev,
      businessDetails: { ...prev.businessDetails, topCategories: newCategories }
    }))
  }

  const handleGstVerification = async () => {
    if (!formData.sellerDetails.gstNumber) {
      setGstError("Please enter a GST number")
      return
    }

    if (formData.sellerDetails.gstNumber.length !== 15) {
      setGstError("GST number must be exactly 15 characters")
      return
    }

    setGstError("")
    setGstVerifying(true)
    
    // DEMO MODE: Simulate GST verification with mock data
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setGstData({
      success: true,
      gstin: formData.sellerDetails.gstNumber,
      legalName: "Demo Enterprise Pvt Ltd",
      tradeName: "Demo Tools & Hardware",
      registrationDate: "2020-01-15",
      status: "Active",
      businessType: "Private Limited Company",
      address: "123 Industrial Area, Phase 2, Mumbai, Maharashtra - 400001",
      addresses: [
        {
          id: "addr1",
          address: "123 Industrial Area, Phase 2, Mumbai, Maharashtra - 400001",
          type: "Principal Place of Business"
        },
        {
          id: "addr2", 
          address: "456 Commercial Complex, Andheri East, Mumbai - 400069",
          type: "Additional Place of Business"
        }
      ],
    })
    setGstVerified(true)
    setValidatedSections(prev => ({ ...prev, gst: true }))
    setGstVerifying(false)
    toast.success("GST verified successfully!")
  }

  // File to base64 converter
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'trademarkAuthDocumentUrl' | 'sellerAuthDocumentUrl' | 'brandLogoUrl',
    setUploading: (val: boolean) => void
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const base64Data = await fileToBase64(file)
      const result = await uploadFileMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileData: base64Data,
        folder: "brand-documents"
      })

      setFormData(prev => ({
        ...prev,
        brandDetails: {
          ...prev.brandDetails,
          [field]: result.url
        }
      }))
    } catch (error) {
      console.error("Failed to upload file:", error)
    } finally {
      setUploading(false)
    }
  }

  // Canvas signature handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setIsDrawing(true)
    context.beginPath()
    context.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    context.lineTo(x, y)
    context.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  // Section validation
  const validateBusinessSection = () => {
    const errors: Record<string, string> = {}
    if (topCategories.length === 0) errors.topCategories = "Select at least one category"
    if (!formData.businessDetails.retailChannel) errors.retailChannel = "Required"
    if (!formData.businessDetails.contactName) errors.contactName = "Required"
    if (!formData.businessDetails.officialEmail) errors.officialEmail = "Required"
    if (!formData.businessDetails.mobileNumber) errors.mobileNumber = "Required"
    
    setErrors(prev => ({ ...prev, ...errors }))
    const isValid = Object.keys(errors).length === 0
    setValidatedSections(prev => ({ ...prev, business: isValid }))
    return isValid
  }

  const validateBrandSection = () => {
    const errors: Record<string, string> = {}
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    
    if (!formData.brandDetails.brandName) errors.brandName = "Required"
    if (!formData.brandDetails.manufacturerName) errors.manufacturerName = "Required"
    
    // In demo mode, file uploads are optional
    if (!isDemoMode) {
      if (!formData.brandDetails.trademarkAuthDocumentUrl) errors.trademarkAuth = "Required"
      if (!formData.brandDetails.sellerAuthDocumentUrl) errors.sellerAuth = "Required"
    }
    
    setErrors(prev => ({ ...prev, ...errors }))
    const isValid = Object.keys(errors).length === 0
    setValidatedSections(prev => ({ ...prev, brand: isValid }))
    return isValid
  }

  const validateBankSection = () => {
    const errors: Record<string, string> = {}
    if (!formData.bankDetails.bankAccountNumber) errors.bankAccountNumber = "Required"
    if (!formData.bankDetails.confirmBankAccountNumber) errors.confirmBankAccountNumber = "Required"
    if (formData.bankDetails.bankAccountNumber !== formData.bankDetails.confirmBankAccountNumber) {
      errors.confirmBankAccountNumber = "Account numbers do not match"
    }
    if (!formData.bankDetails.ifscCode) errors.ifscCode = "Required"
    if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode)) {
      errors.ifscCode = "Invalid IFSC code format"
    }
    if (!formData.bankDetails.bankType) errors.bankType = "Required"
    
    setErrors(prev => ({ ...prev, ...errors }))
    const isValid = Object.keys(errors).length === 0
    setValidatedSections(prev => ({ ...prev, bank: isValid }))
    return isValid
  }

  const validateShippingSection = () => {
    const errors: Record<string, string> = {}
    if (!formData.shippingLocations.selectedAddressId) errors.shippingAddress = "Required"
    
    setErrors(prev => ({ ...prev, ...errors }))
    const isValid = Object.keys(errors).length === 0
    setValidatedSections(prev => ({ ...prev, shipping: isValid }))
    return isValid
  }

  const validateSignatureSection = () => {
    const isValid = hasSignature
    setValidatedSections(prev => ({ ...prev, signature: isValid }))
    if (!isValid) setErrors(prev => ({ ...prev, signature: "Signature required" }))
    return isValid
  }

  // Submit form
  const handleSubmit = async () => {
    // Validate all sections
    const businessValid = validateBusinessSection()
    const gstValid = gstVerified
    const brandValid = validateBrandSection()
    const bankValid = validateBankSection()
    const shippingValid = validateShippingSection()
    const signatureValid = validateSignatureSection()

    if (!businessValid || !gstValid || !brandValid || !bankValid || !shippingValid || !signatureValid) {
      alert("Please complete all required sections")
      return
    }

    if (!termsAccepted) {
      alert("Please accept the Terms & Conditions to continue")
      return
    }

    // Capture signature
    const canvas = canvasRef.current
    if (canvas) {
      const signatureData = canvas.toDataURL()
      setFormData(prev => ({
        ...prev,
        digitalSignature: { signature: signatureData }
      }))
    }

    setIsSubmitting(true)
    try {
      await onboardingMutation.mutateAsync(formData)
      
      // DEMO MODE: Always go directly to dashboard
      toast.success("Application submitted successfully! Redirecting to dashboard...")
      await new Promise(resolve => setTimeout(resolve, 1500))
      router.push("/seller")
    } catch (error) {
      console.error("Onboarding submission failed:", error)
      alert("Submission failed. Please try again.")
      setIsSubmitting(false)
    }
  }

  const addresses = gstData?.addresses || []

  // Progress indicator component
  const ProgressIcon = ({ isComplete, children }: { isComplete: boolean; children: React.ReactNode }) => (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
      isComplete 
        ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30' 
        : 'bg-white border-2 border-blue-300'
    }`}>
      {children}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-600">Seller Onboarding</h1>
          <p className="text-gray-600 mt-2">Complete all sections to get started on the platform</p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Section 1: Business Details */}
          <div className="flex gap-6">
            <div className="hidden lg:flex flex-col items-center">
              <ProgressIcon isComplete={validatedSections.business}>
                <svg className={`w-5 h-5 ${validatedSections.business ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </ProgressIcon>
              <div className="w-0.5 flex-1 bg-gray-200 mt-2">
                <div className={`w-full transition-all duration-500 ${validatedSections.business ? 'bg-blue-500 h-full' : 'h-0'}`} />
              </div>
            </div>
            <Card className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">1. Business Details</h2>
                  <p className="text-sm text-gray-600">Information about your products and sales</p>
                </div>
                {validatedSections.business && <CheckCircle className="h-6 w-6 text-blue-500" />}
              </div>

              <div className="space-y-5">
                <div>
                  <Label>Product Categories (Up to 10) *</Label>
                  <Select onValueChange={handleCategorySelect}>
                    <SelectTrigger className="w-full min-h-[40px] h-auto p-2 mt-2">
                      <div className="flex flex-wrap gap-2 w-full">
                        {topCategories.length > 0 ? (
                          topCategories.map((category) => (
                            <Badge key={category} className="flex items-center gap-1 bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200">
                              {category}
                              <X size={12} className="cursor-pointer" onClick={(e) => {
                                e.stopPropagation()
                                handleCategoryRemove(category)
                              }} />
                            </Badge>
                          ))
                        ) : (
                          <SelectValue />
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => !topCategories.includes(c)).map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.topCategories && <p className="text-sm text-red-500 mt-1">{errors.topCategories}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FloatingSelect
                    label="Retail Channel *"
                    value={formData.businessDetails.retailChannel}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      businessDetails: { ...prev.businessDetails, retailChannel: val }
                    }))}
                    options={[
                      { value: 'online', label: 'Online Store' },
                      { value: 'physical', label: 'Physical Store' },
                      { value: 'marketplace', label: 'Marketplace' },
                      { value: 'both', label: 'Both' }
                    ]}
                    error={errors.retailChannel}
                  />
                  <FloatingInput
                    label="Reference Link"
                    value={formData.businessDetails.referenceLink || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      businessDetails: { ...prev.businessDetails, referenceLink: e.target.value }
                    }))}
                  />
                  <FloatingSelect
                    label="Total Monthly Sales"
                    value={formData.businessDetails.totalMonthlySales}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      businessDetails: { ...prev.businessDetails, totalMonthlySales: val }
                    }))}
                    options={[
                      { value: '0-25L', label: '0-25 lakhs' },
                      { value: '25-75L', label: '25-75 lakhs' },
                      { value: '75L-1Cr', label: '75 lakhs - 1 crore' },
                      { value: '1Cr+', label: '1 crore+' }
                    ]}
                  />
                </div>

                {/* Primary Contact */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Primary Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FloatingInput
                      label="Contact Name *"
                      value={formData.businessDetails.contactName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, contactName: e.target.value }
                      }))}
                      error={errors.contactName}
                    />
                    <FloatingInput
                      label="Official Email *"
                      value={formData.businessDetails.officialEmail}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, officialEmail: e.target.value }
                      }))}
                      error={errors.officialEmail}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FloatingInput
                      label="Mobile Number *"
                      value={formData.businessDetails.mobileNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, mobileNumber: e.target.value }
                      }))}
                      error={errors.mobileNumber}
                    />
                    <FloatingInput
                      label="Designation"
                      value={formData.businessDetails.designation || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, designation: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* Secondary Contact */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Secondary Contact (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FloatingInput
                      label="Contact Name"
                      value={formData.businessDetails.secondaryContactName || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, secondaryContactName: e.target.value }
                      }))}
                    />
                    <FloatingInput
                      label="Email"
                      value={formData.businessDetails.secondaryEmail || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, secondaryEmail: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FloatingInput
                      label="Mobile Number"
                      value={formData.businessDetails.secondaryMobileNumber || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, secondaryMobileNumber: e.target.value }
                      }))}
                    />
                    <FloatingInput
                      label="Designation"
                      value={formData.businessDetails.secondaryDesignation || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        businessDetails: { ...prev.businessDetails, secondaryDesignation: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Section 2: GST Details */}
          <div className="flex gap-6">
            <div className="hidden lg:flex flex-col items-center">
              <ProgressIcon isComplete={validatedSections.gst}>
                <svg className={`w-5 h-5 ${validatedSections.gst ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </ProgressIcon>
              <div className="w-0.5 flex-1 bg-gray-200 mt-2">
                <div className={`w-full transition-all duration-500 ${validatedSections.gst ? 'bg-blue-500 h-full' : 'h-0'}`} />
              </div>
            </div>
            <Card className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">2. GST Details</h2>
                  <p className="text-sm text-gray-600">Verify your business GST number</p>
                </div>
                {validatedSections.gst && <CheckCircle className="h-6 w-6 text-blue-500" />}
              </div>

              <div className="space-y-5">
                <FloatingInput
                  label="GST Number (15 digits) *"
                  value={formData.sellerDetails.gstNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sellerDetails: { gstNumber: e.target.value.toUpperCase() }
                  }))}
                  error={gstError}
                  disabled={gstVerified}
                  maxLength={15}
                  placeholder="27AAPFU0939F1ZV"
                />

                {!gstVerified && formData.sellerDetails.gstNumber && (
                  <Button
                    onClick={handleGstVerification}
                    disabled={gstVerifying || formData.sellerDetails.gstNumber.length !== 15}
                    className="w-full bg-green-100 hover:bg-green-200 text-green-700 border border-green-300"
                  >
                    {gstVerifying ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying GST...</>
                    ) : (
                      'Verify GST Number'
                    )}
                  </Button>
                )}

                {gstData?.success && (
                  <div className="border-2 border-dashed rounded-lg p-6 bg-green-50 border-green-300">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-700">GST Verified Successfully</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">GSTIN:</span>
                        <div className="mt-1 font-mono">{gstData.gstin}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Legal Name:</span>
                        <div className="mt-1">{gstData.legalName}</div>
                      </div>
                      {gstData.tradeName && (
                        <div>
                          <span className="font-medium text-gray-600">Trade Name:</span>
                          <div className="mt-1">{gstData.tradeName}</div>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-600">Business Type:</span>
                        <div className="mt-1">{gstData.businessType}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <div className="mt-1 text-green-600 font-semibold">{gstData.status}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Registration Date:</span>
                        <div className="mt-1">{gstData.registrationDate}</div>
                      </div>
                      {gstData.address && (
                        <div className="col-span-2">
                          <span className="font-medium text-gray-600">Address:</span>
                          <div className="mt-1">{gstData.address}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Section 3: Brand Details */}
          <div className="flex gap-6">
            <div className="hidden lg:flex flex-col items-center">
              <ProgressIcon isComplete={validatedSections.brand && validatedSections.shipping}>
                <svg className={`w-5 h-5 ${validatedSections.brand && validatedSections.shipping ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </ProgressIcon>
              <div className="w-0.5 flex-1 bg-gray-200 mt-2">
                <div className={`w-full transition-all duration-500 ${validatedSections.brand && validatedSections.shipping ? 'bg-blue-500 h-full' : 'h-0'}`} />
              </div>
            </div>
            <Card className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">3. Brand Details</h2>
                  <p className="text-sm text-gray-600">Brand information and documents</p>
                </div>
                {validatedSections.brand && <CheckCircle className="h-6 w-6 text-blue-500" />}
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <FloatingInput
                    label="Brand Name *"
                    value={formData.brandDetails.brandName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      brandDetails: { ...prev.brandDetails, brandName: e.target.value }
                    }))}
                    error={errors.brandName}
                  />
                  <FloatingInput
                    label="Manufacturer Name *"
                    value={formData.brandDetails.manufacturerName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      brandDetails: { ...prev.brandDetails, manufacturerName: e.target.value }
                    }))}
                    error={errors.manufacturerName}
                  />
                </div>

                <FloatingInput
                  label="Trademark Number"
                  value={formData.brandDetails.trademarkNumber || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    brandDetails: { ...prev.brandDetails, trademarkNumber: e.target.value }
                  }))}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Trademark Authorization *</Label>
                    <label
                      htmlFor="trademark-upload"
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                        authDocUploading ? "border-gray-300 bg-gray-50 cursor-not-allowed" :
                        formData.brandDetails.trademarkAuthDocumentUrl ? "border-green-500 bg-green-50 hover:bg-green-100" :
                        "border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {authDocUploading ? (
                          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-2" />
                        ) : formData.brandDetails.trademarkAuthDocumentUrl ? (
                          <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        ) : (
                          <FileText className="h-8 w-8 text-gray-400 mb-2" />
                        )}
                        <p className="text-xs text-gray-500 text-center px-2">
                          {authDocUploading ? "Uploading..." :
                           formData.brandDetails.trademarkAuthDocumentUrl ? "Document Uploaded" :
                           "Click to upload document"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG</p>
                      </div>
                      <input
                        id="trademark-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'trademarkAuthDocumentUrl', setAuthDocUploading)}
                        disabled={authDocUploading}
                      />
                    </label>
                    {formData.brandDetails.trademarkAuthDocumentUrl && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => previewFile(formData.brandDetails.trademarkAuthDocumentUrl)}
                        >
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => document.getElementById('trademark-upload')?.click()}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                    {errors.trademarkAuth && <p className="text-sm text-red-500 mt-1">{errors.trademarkAuth}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Label>Seller Authorization *</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Download the template, fill it with your company details, sign it on company letterhead, 
                                and upload the scanned/signed copy as PDF or image.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <a
                        href="/seller-authorization-letter.docx"
                        download="seller-authorization-letter.docx"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download Template
                      </a>
                    </div>
                    <label
                      htmlFor="seller-auth-upload"
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                        sellerAuthUploading ? "border-gray-300 bg-gray-50 cursor-not-allowed" :
                        formData.brandDetails.sellerAuthDocumentUrl ? "border-green-500 bg-green-50 hover:bg-green-100" :
                        "border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {sellerAuthUploading ? (
                          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-2" />
                        ) : formData.brandDetails.sellerAuthDocumentUrl ? (
                          <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        ) : (
                          <FileText className="h-8 w-8 text-gray-400 mb-2" />
                        )}
                        <p className="text-xs text-gray-500 text-center px-2">
                          {sellerAuthUploading ? "Uploading..." :
                           formData.brandDetails.sellerAuthDocumentUrl ? "Document Uploaded" :
                           "Click to upload document"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG</p>
                      </div>
                      <input
                        id="seller-auth-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'sellerAuthDocumentUrl', setSellerAuthUploading)}
                        disabled={sellerAuthUploading}
                      />
                    </label>
                    {formData.brandDetails.sellerAuthDocumentUrl && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => previewFile(formData.brandDetails.sellerAuthDocumentUrl)}
                        >
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => document.getElementById('seller-auth-upload')?.click()}
                        >
                          Change
                        </Button>
                      </div>
                    )}
                    {errors.sellerAuth && <p className="text-sm text-red-500 mt-1">{errors.sellerAuth}</p>}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Brand Logo (Optional)</Label>
                  <p className="text-xs text-gray-500 mb-3">
                    Guidelines: Square format (1:1 ratio), minimum 500x500px, transparent background preferred, PNG format recommended
                  </p>
                  <label
                    htmlFor="brand-logo-upload"
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                      logoUploading ? "border-gray-300 bg-gray-50 cursor-not-allowed" :
                      formData.brandDetails.brandLogoUrl ? "border-green-500 bg-green-50 hover:bg-green-100" :
                      "border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {logoUploading ? (
                        <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-2" />
                      ) : formData.brandDetails.brandLogoUrl ? (
                        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                      )}
                      <p className="text-xs text-gray-500 text-center px-2">
                        {logoUploading ? "Uploading..." :
                         formData.brandDetails.brandLogoUrl ? "Logo Uploaded" :
                         "Click to upload brand logo"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG</p>
                    </div>
                    <input
                      id="brand-logo-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'brandLogoUrl', setLogoUploading)}
                      disabled={logoUploading}
                    />
                  </label>
                  {formData.brandDetails.brandLogoUrl && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => previewFile(formData.brandDetails.brandLogoUrl)}
                      >
                        Preview
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => document.getElementById('brand-logo-upload')?.click()}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>

                {/* Shipping Location */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-6">Shipping Location</h3>
                  <div>
                    <Label>Select Shipping Address *</Label>
                    <Select
                      value={formData.shippingLocations.selectedAddressId}
                      onValueChange={(val) => {
                        setFormData(prev => ({
                          ...prev,
                          shippingLocations: {
                            selectedAddressId: val,
                            isMainAddress: val === 'principal'
                          }
                        }))
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select address from GST registration" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.formattedAddress}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.shippingAddress && <p className="text-sm text-red-500 mt-1">{errors.shippingAddress}</p>}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Section 4: Bank Details */}
          <div className="flex gap-6">
            <div className="hidden lg:flex flex-col items-center">
              <ProgressIcon isComplete={validatedSections.bank}>
                <svg className={`w-5 h-5 ${validatedSections.bank ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </ProgressIcon>
              <div className="w-0.5 flex-1 bg-gray-200 mt-2">
                <div className={`w-full transition-all duration-500 ${validatedSections.bank ? 'bg-blue-500 h-full' : 'h-0'}`} />
              </div>
            </div>
            <Card className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">4. Bank Details</h2>
                  <p className="text-sm text-gray-600">Account information for payouts</p>
                </div>
                {validatedSections.bank && <CheckCircle className="h-6 w-6 text-blue-500" />}
              </div>

              <div className="space-y-5">
                <FloatingInput
                  label="Bank Account Number *"
                  value={formData.bankDetails.bankAccountNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    bankDetails: { ...prev.bankDetails, bankAccountNumber: e.target.value }
                  }))}
                  error={errors.bankAccountNumber}
                />

                <FloatingInput
                  label="Re-enter Bank Account Number *"
                  value={formData.bankDetails.confirmBankAccountNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    bankDetails: { ...prev.bankDetails, confirmBankAccountNumber: e.target.value }
                  }))}
                  error={errors.confirmBankAccountNumber}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FloatingInput
                    label="IFSC Code *"
                    value={formData.bankDetails.ifscCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, ifscCode: e.target.value.toUpperCase() }
                    }))}
                    error={errors.ifscCode}
                  />
                  <FloatingSelect
                    label="Bank Type *"
                    value={formData.bankDetails.bankType}
                    onValueChange={(val) => setFormData(prev => ({
                      ...prev,
                      bankDetails: { ...prev.bankDetails, bankType: val }
                    }))}
                    options={[
                      { value: 'savings', label: 'Savings Account' },
                      { value: 'current', label: 'Current Account' },
                      { value: 'cc', label: 'Cash Credit' },
                      { value: 'od', label: 'Overdraft' }
                    ]}
                    error={errors.bankType}
                  />
                </div>

                {/* Bank Validation */}
                <div>
                  <Button
                    type="button"
                    onClick={handleBankValidation}
                    disabled={bankVerifying || bankVerified}
                    className={cn(
                      "w-full",
                      bankVerified ? "bg-green-600 hover:bg-green-700" : ""
                    )}
                  >
                    {bankVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating Account...
                      </>
                    ) : bankVerified ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Account Validated
                      </>
                    ) : (
                      "Validate Bank Account"
                    )}
                  </Button>
                  {bankError && <p className="text-sm text-red-500 mt-2">{bankError}</p>}
                  {bankVerified && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-green-700">Bank Account Verified</p>
                          <p className="text-xs text-green-600 mt-1">
                            Account validated successfully. Ready for transactions.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Section 5: Digital Signature */}
          <div className="flex gap-6">
            <div className="hidden lg:flex flex-col items-center">
              <ProgressIcon isComplete={validatedSections.signature}>
                <svg className={`w-5 h-5 ${validatedSections.signature ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </ProgressIcon>
              <div className="w-0.5 flex-1 bg-gray-200 mt-2">
                <div className={`w-full transition-all duration-500 ${validatedSections.signature ? 'bg-blue-500 h-full' : 'h-0'}`} />
              </div>
            </div>
            <Card className="flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">5. Digital Signature</h2>
                  <p className="text-sm text-gray-600">Sign to complete the onboarding</p>
                </div>
                {validatedSections.signature && <CheckCircle className="h-6 w-6 text-blue-500" />}
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Draw your signature below *</Label>
                  <canvas
                    ref={canvasRef}
                    className="mt-2 w-full h-64 border-2 border-gray-300 rounded-lg cursor-crosshair bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  {errors.signature && <p className="text-sm text-red-500 mt-1">{errors.signature}</p>}
                </div>

                <Button onClick={clearSignature} variant="outline">
                  Clear Signature
                </Button>
              </div>
            </Card>
          </div>

          {/* Terms & Conditions */}
          <div className="flex gap-6" ref={termsRef}>
            <div className="hidden lg:flex flex-col items-center">
              <ProgressIcon isComplete={validatedSections.terms}>
                <svg className={`w-5 h-5 ${validatedSections.terms ? 'text-white' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </ProgressIcon>
            </div>
            <Card className="flex-1 p-6">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => {
                    setTermsExpanded(!termsExpanded)
                    if (!termsExpanded && termsRef.current) {
                      setTimeout(() => {
                        termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }, 100)
                    }
                  }}
                >
                  <div>
                    <h2 className="text-xl font-semibold">6. Terms & Conditions</h2>
                    <p className="text-sm text-gray-600">Read and accept to continue</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {validatedSections.terms && <CheckCircle className="h-6 w-6 text-blue-500" />}
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${termsExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Preview Summary - Always Visible */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    By registering as a seller on Kareegar Bros platform, you agree to our terms governing the sale and distribution of goods. This includes granting us unrestricted rights to resell your products, full pricing control, and waiving objections to our business operations.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => setTermsExpanded(!termsExpanded)} 
                    className="text-sm text-blue-600 hover:underline font-medium mt-2"
                  >
                    {termsExpanded ? 'Show less' : 'Read full terms'}
                  </button>
                </div>
                
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  termsExpanded ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="overflow-y-auto max-h-96 border rounded-lg p-4 bg-white text-sm text-gray-700 space-y-4">
                    <h3 className="font-bold text-center text-base">TERMS & CONDITIONS – SELLER AGREEMENT</h3>
                    <p>
                      This Seller Agreement (&quot;Agreement&quot;) is entered into by Kareegar Bros (&quot;Buyer&quot;) and the undersigned Seller (&quot;Seller&quot;) (together, the &quot;Parties&quot;), and forms a contract governed by the Indian Contract Act, 1872, as amended from time to time. By accepting this Agreement, the Seller expressly agrees to be bound by the following terms and conditions:
                    </p>
                    
                    <div>
                      <h4 className="font-semibold">1. Purpose and Intent</h4>
                      <p>The Seller acknowledges that the Goods supplied under this Agreement (&quot;Goods&quot;) are purchased by the Buyer solely for its own use and for the purpose of resale, distribution, and commercial exploitation in the Indian market or any other market at the Buyer&apos;s discretion.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">2. Absolute Right to Resell</h4>
                      <p>The Buyer shall have unrestricted, exclusive, and absolute rights to sell, supply, distribute, or otherwise transfer the Goods to any third party, including affiliates, sister concerns, subsidiaries, or any entity of its choosing, in any quantity, at any price, and by any method or channel, without interference or restriction from the Seller.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">3. Control Over Pricing and Terms of Resale</h4>
                      <p>The Buyer shall have the sole and unfettered discretion to determine the price, payment terms, and conditions of resale of the Goods, and the Seller shall not impose or seek to impose any conditions, restrictions, or requirements relating thereto.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">4. No Seller Interference or Objection</h4>
                      <p>Upon transfer of ownership and delivery of the Goods to the Buyer, the Seller irrevocably waives any and all rights to object, challenge, or interfere with any aspect of the Buyer&apos;s resale, distribution, or further dealings with the Goods. This waiver includes but is not limited to claims based on contractual terms, proprietary rights, or any alleged violation of law or practice.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">5. Non-Assertion of Trademark or Intellectual Property Claims</h4>
                      <p>The Seller expressly agrees that it shall never assert, nor authorize any third party to assert, any trademark infringement, passing off, or other intellectual property rights claims against the Buyer or any subsequent purchaser arising from the resale of the Goods, provided the Goods are not materially altered, modified, or counterfeited by the Buyer or its assignees.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">6. No Interest in Buyer&apos;s Revenues or Profits</h4>
                      <p>The Seller hereby unequivocally acknowledges and agrees that it has no legal or equitable interest, claim, lien, or right in or to any profits, revenues, commissions, or economic benefits derived by the Buyer from the resale or commercial exploitation of the Goods.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">7. Transfer of Title and Risk</h4>
                      <p>Title to the Goods shall pass to the Buyer only upon full payment and physical delivery in accordance with this Agreement. Risk in the Goods shall pass to the Buyer upon delivery at the agreed location, and the Buyer shall bear all risks and liabilities thereafter.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">8. Entire Agreement and Amendments</h4>
                      <p>This Agreement, together with these Terms & Conditions, constitute the entire agreement between the Parties pertaining to the Goods and supersede all prior agreements, understandings, or representations. No amendment or waiver shall be valid unless made in writing and signed by both Parties.</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold">9. Governing Law and Dispute Resolution</h4>
                      <p>These Terms & Conditions shall be governed by and construed in accordance with the laws of India, including the Indian Contract Act, 1872 and all relevant statutory amendments. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts located in Mumbai, India.</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms-checkbox" className="text-sm text-gray-700">
                    I have read and agree to the <button type="button" onClick={() => setTermsExpanded(true)} className="text-blue-600 hover:underline font-medium">Terms & Conditions</button>. I understand that by checking this box, I am entering into a legally binding agreement with Kareegar Bros.
                  </label>
                </div>
              </div>
            </Card>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 pb-8">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !termsAccepted}
              size="lg"
              className="bg-brand-red hover:bg-brand-red-dark text-white px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                'Submit Onboarding'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Submitting Your Application</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    Please wait while we process your seller onboarding application...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


