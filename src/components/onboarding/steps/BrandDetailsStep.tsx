"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { BrandDetailsData, StepComponentProps } from "@/types/onboarding"
import { Download, Upload, CheckCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { trpc } from "@/lib/trpc-provider"
import { useMutation } from "@tanstack/react-query"

interface BrandDetailsStepProps extends StepComponentProps {
  data: BrandDetailsData
  updateData: (data: BrandDetailsData) => void
}

export default function BrandDetailsStep({ onNext, onBack, data, updateData }: BrandDetailsStepProps) {
  const [authDocUploading, setAuthDocUploading] = useState(false)
  const [sellerAuthUploading, setSellerAuthUploading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [formData, setFormData] = useState({
    brandName: data.brandName || '',
    manufacturerName: data.manufacturerName || '',
    trademarkNumber: data.trademarkNumber || ''
  })
  
  const { handleSubmit, formState: { errors } } = useForm<BrandDetailsData>({
    defaultValues: data
  })

  const uploadFileMutation = useMutation(trpc.seller.uploadFile.mutationOptions())

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data:mime/type;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const onSubmit = () => {
    updateData({
      ...formData,
      trademarkAuthDocumentUrl: data.trademarkAuthDocumentUrl,
      sellerAuthDocumentUrl: data.sellerAuthDocumentUrl,
      brandLogoUrl: data.brandLogoUrl
    })
    onNext()
  }

  const handleAuthDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAuthDocUploading(true)
    try {
      const base64Data = await fileToBase64(file)
      const result = await uploadFileMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileData: base64Data,
        folder: "brand-authorization"
      })

      updateData({
        ...data,
        trademarkAuthDocumentUrl: result.fileUrl
      })
    } catch (error) {
      console.error("Failed to upload authorization document:", error)
    } finally {
      setAuthDocUploading(false)
    }
  }

  const handleSellerAuthUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSellerAuthUploading(true)
    try {
      const base64Data = await fileToBase64(file)
      const result = await uploadFileMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileData: base64Data,
        folder: "seller-authorization"
      })

      updateData({
        ...data,
        sellerAuthDocumentUrl: result.fileUrl
      })
    } catch (error) {
      console.error("Failed to upload seller authorization document:", error)
    } finally {
      setSellerAuthUploading(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLogoUploading(true)
    try {
      const base64Data = await fileToBase64(file)
      const result = await uploadFileMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileData: base64Data,
        folder: "brand-logos"
      })

      updateData({
        ...data,
        brandLogoUrl: result.fileUrl
      })
    } catch (error) {
      console.error("Failed to upload brand logo:", error)
    } finally {
      setLogoUploading(false)
    }
  }

  // Download authorization letter template
  const downloadAuthorizationTemplate = () => {
    const template = `(To be printed on letterhead of the concerned Brand)

AUTHORISATION LETTER

To,

Helfer

Details of the entity that owns the brand trademark:

We, [insert name of the entity which holds the brand trademark] bearing PAN No. [insert PAN of the entity] and having our registered address at [insert registered address] hereby declare and confirm that we are the perpetual owners of the following brand:

* Brand Name ("Brand"):

* Brand Trademark Registration Number:

Details of the seller entity:

We hereby confirm that, [name of the seller] (entity name will be same as above if the brand owner is the seller) bearing PAN No. [insert PAN of the entity] and having registered address at [insert registered address] has the full authority to list, distribute and sell the Brand's products on Helfer's platform and marketplace owned and controlled by Helfer ("Helfer") and undertake all other ancillary actions in relation thereto.

The aforesaid authorisation shall continue to be valid in perpetuity until any changes thereof are notified by us to Helfer by raising a ticket through Help & Support, at least 30 days prior to the effective date of the relevant change.

Thank you

For ____________

Authorised Signatory

Name:

Designation:

Stamp of the Brand:`

    const blob = new Blob([template], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'Brand_Authorization_Letter_Template.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Brand details</h2>
        <p className="text-sm text-gray-600">Add details of brands which you wish to sell</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          <FloatingInput
            label="Enter brand name *"
            name="brandName"
            value={formData.brandName}
            onChange={handleInputChange}
            error={errors.brandName?.message}
            required
          />

          <FloatingInput
            label="Enter manufacturer name *"
            name="manufacturerName"
            value={formData.manufacturerName}
            onChange={handleInputChange}
            error={errors.manufacturerName?.message}
            required
          />

          {/* Brand trademark number */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              Brand trademark number <span className="text-gray-400">ℹ</span>
            </Label>
            <div className="mt-2">
              <FloatingInput
                label="Enter trademark registration number *"
                name="trademarkNumber"
                value={formData.trademarkNumber}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* File Upload for Authorization Document */}
          <div className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
            <div className="flex flex-col gap-2 md:w-1/3">
              <Button
                type="button"
                variant="outline"
                className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 w-full md:w-auto"
                onClick={() => document.getElementById('auth-doc-upload')?.click()}
                disabled={authDocUploading}
              >
                {authDocUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : data.trademarkAuthDocumentUrl ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {authDocUploading ? "Uploading..." : data.trademarkAuthDocumentUrl ? "Uploaded" : "Upload file"}
              </Button>
              <input
                id="auth-doc-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleAuthDocUpload}
                className="hidden"
              />
              {data.trademarkAuthDocumentUrl && (
                <p className="text-sm text-green-600 mt-1">✓ Authorization document uploaded</p>
              )}
            </div>
            <div className="text-sm text-gray-500 md:w-2/3 md:pl-4 mt-2 md:mt-0">
              <div>Maximum file size: 5 MB</div>
              <div>Supported formats: pdf, png, jpg</div>
            </div>
          </div>

          {/* Seller Authorization Document */}
          <div className="mt-6">
            <Label className="text-sm font-medium flex items-center gap-2">
              Seller authorization document <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2 flex flex-col md:flex-row md:items-center md:gap-6">
              <div className="flex flex-col gap-2 md:w-1/3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-brand-navy-light hover:bg-brand-navy/20 text-brand-navy border-brand-navy/30 w-full md:w-auto"
                  onClick={downloadAuthorizationTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download format
                </Button>
              </div>
              <div className="text-sm text-gray-500 md:w-2/3 md:pl-4 mt-2 md:mt-0">
                <div>Download this template and upload it below</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-6">
              <div className="flex flex-col gap-2 md:w-1/3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 w-full md:w-auto"
                  onClick={() => document.getElementById('seller-auth-upload')?.click()}
                  disabled={sellerAuthUploading}
                >
                  {sellerAuthUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : data.sellerAuthDocumentUrl ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {sellerAuthUploading ? "Uploading..." : data.sellerAuthDocumentUrl ? "Uploaded" : "Upload file"}
                </Button>
                <input
                  id="seller-auth-upload"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleSellerAuthUpload}
                  className="hidden"
                />
                {data.sellerAuthDocumentUrl && (
                  <p className="text-sm text-green-600 mt-1">✓ Seller authorization uploaded</p>
                )}
              </div>
              <div className="text-sm text-gray-500 md:w-2/3 md:pl-4 mt-2 md:mt-0">
                <div>Maximum file size: 5 MB</div>
                <div>Supported formats: pdf, png, jpg</div>
              </div>
            </div>
          </div>

          {/* Brand Logo Upload */}
          <div className="mt-6">
            <Label className="text-sm font-medium">
              Upload brand logo <span className="text-red-500">*</span>
            </Label>

            <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-6">
              <div className="flex flex-col gap-2 md:w-1/3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-green-100 hover:bg-green-200 text-green-700 border-green-300 w-full md:w-auto"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={logoUploading}
                >
                  {logoUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : data.brandLogoUrl ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {logoUploading ? "Uploading..." : data.brandLogoUrl ? "Uploaded" : "Upload file"}
                </Button>
                <input
                  id="logo-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {data.brandLogoUrl && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-green-600">✓ Brand logo uploaded</p>
                    {data.brandLogoUrl && (
                      <img 
                        src={data.brandLogoUrl} 
                        alt="Brand logo preview" 
                        className="w-20 h-20 object-contain border border-gray-200 rounded p-2"
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 md:w-2/3 md:pl-4 mt-2 md:mt-0">
                <div>Maximum file size: 5 MB</div>
                <div>Supported formats: png, jpg</div>
              </div>
            </div>
            
            {/* Logo Guidelines - Moved below upload */}
            <div className="mt-4 p-4 bg-brand-navy-light border border-brand-navy/20 rounded-lg">
              <h4 className="text-sm font-semibold text-brand-navy-dark mb-2">Logo Guidelines:</h4>
              <ul className="text-sm text-brand-navy space-y-1 list-disc list-inside">
                <li>Format: PNG or JPG with transparent background (PNG preferred)</li>
                <li>Dimensions: Minimum 500x500 pixels, Maximum 2000x2000 pixels</li>
                <li>Aspect Ratio: Square (1:1) recommended</li>
                <li>File Size: Maximum 5 MB</li>
                <li>Quality: High resolution (at least 300 DPI)</li>
                <li>Content: Logo should be clear, without any text or taglines unless part of the brand identity</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-end pt-6 gap-4">
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
          >
            Save & continue
          </Button>
        </div>
      </form>
    </div>
  )
} 