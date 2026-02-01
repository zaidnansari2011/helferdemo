"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { FloatingSelect } from "@/components/ui/FloatingSelect"
import { BusinessDetailsData, StepComponentProps } from "@/types/onboarding"
import { useState } from "react"
import { X } from "lucide-react"

interface BusinessDetailsStepProps extends StepComponentProps {
  data: BusinessDetailsData
  updateData: (data: BusinessDetailsData) => void
}

const categories = [
  "Tools", "Wood work", "Electrical", "Security Systems", "Plumbing", 
  "Safety Equipment", "Painting"
]

export default function BusinessDetailsStep({ onNext, data, updateData }: BusinessDetailsStepProps) {
  const [topCategories, setTopCategories] = useState<string[]>(data.topCategories || [])
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BusinessDetailsData>({
    defaultValues: data
  })

  const handleCategorySelect = (category: string) => {
    if (!topCategories.includes(category) && topCategories.length < 10) {
      const newCategories = [...topCategories, category]
      setTopCategories(newCategories)
      setValue('topCategories', newCategories)
    }
  }

  const handleCategoryRemove = (category: string) => {
    const newCategories = topCategories.filter(c => c !== category)
    setTopCategories(newCategories)
    setValue('topCategories', newCategories)
  }

  const onSubmit = (formData: BusinessDetailsData) => {
    updateData({ ...formData, topCategories })
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Business details</h2>
        <p className="text-sm text-gray-600">Enter the details about your products and sales</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Category & sales details */}
        <div>
          <h3 className="text-lg font-medium mb-4">Category & sales details</h3>
          
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">
                Add top categories in which you sell your products (Upto 10) <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2">
                <Select onValueChange={handleCategorySelect}>
                  <SelectTrigger className="w-full min-h-[40px] h-auto p-2">
                    <div className="flex flex-wrap gap-2 w-full">
                      {topCategories.length > 0 ? (
                        <>
                          {topCategories.map((category) => (
                            <Badge
                              key={category}
                              variant="default"
                              className="flex items-center gap-1 pr-1 bg-brand-navy-light text-black/70 border-brand-navy/20 hover:bg-brand-navy/20"
                            >
                              {category}
                              <span
                                role="button"
                                tabIndex={0}
                                className="ml-1 p-0.5 rounded-full cursor-pointer hover:bg-black/10"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCategoryRemove(category);
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCategoryRemove(category);
                                  }
                                }}
                              >
                                <X size={12} />
                              </span>
                            </Badge>
                          ))}
                        </>
                      ) : (
                        <SelectValue  />
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(category => !topCategories.includes(category))
                      .map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Select your retail channels</Label>
              <div className="grid grid-cols-3 gap-3">
                <FloatingSelect
                  label="Retail channel *"
                  value={watch('retailChannel')}
                  onValueChange={(value) => setValue('retailChannel', value)}
                  options={[
                    { value: 'online', label: 'Online Store' },
                    { value: 'physical', label: 'Physical Store' },
                    { value: 'marketplace', label: 'Marketplace' },
                    { value: 'both', label: 'Both Online & Physical' }
                  ]}
                />
                <FloatingInput
                  label="Reference link"
                  name="referenceLink"
                  value={watch('referenceLink') || ''}
                  onChange={(e) => setValue('referenceLink', e.target.value)}
                />
                <FloatingSelect
                  label="Total monthly sales"
                  value={watch('totalMonthlySales')}
                  onValueChange={(value) => setValue('totalMonthlySales', value)}
                  options={[
                    { value: '0-1L', label: '₹0 - ₹1 Lakh' },
                    { value: '1L-5L', label: '₹1 - ₹5 Lakh' },
                    { value: '5L-10L', label: '₹5 - ₹10 Lakh' },
                    { value: '10L+', label: '₹10+ Lakh' }
                  ]}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Select your social channels</Label>
              <div className="grid grid-cols-3 gap-3">
                <FloatingSelect
                  label="Social channel *"
                  value={watch('socialChannel')}
                  onValueChange={(value) => setValue('socialChannel', value)}
                  options={[
                    { value: 'facebook', label: 'Facebook' },
                    { value: 'instagram', label: 'Instagram' },
                    { value: 'twitter', label: 'Twitter' },
                    { value: 'linkedin', label: 'LinkedIn' },
                    { value: 'youtube', label: 'YouTube' }
                  ]}
                />
                <FloatingInput
                  label="Social media link"
                  name="socialMediaLink"
                  value={watch('socialMediaLink') || ''}
                  onChange={(e) => setValue('socialMediaLink', e.target.value)}
                />
                <FloatingSelect
                  label="User count"
                  value={watch('userCount')}
                  onValueChange={(value) => setValue('userCount', value)}
                  options={[
                    { value: '0-1K', label: '0 - 1K' },
                    { value: '1K-10K', label: '1K - 10K' },
                    { value: '10K-100K', label: '10K - 100K' },
                    { value: '100K+', label: '100K+' }
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact details */}
        <div>
          <h3 className="text-lg font-medium mb-4">Contact details</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                label="Name *"
                name="contactName"
                value={watch('contactName') || ''}
                onChange={(e) => setValue('contactName', e.target.value)}
                error={errors.contactName?.message}
                required
              />
              <FloatingInput
                label="Official e-mail ID *"
                name="officialEmail"
                type="email"
                value={watch('officialEmail') || ''}
                onChange={(e) => setValue('officialEmail', e.target.value)}
                error={errors.officialEmail?.message}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FloatingSelect
                label="Designation *"
                value={watch('designation')}
                onValueChange={(value) => setValue('designation', value)}
                options={[
                  { value: 'owner', label: 'Owner' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'director', label: 'Director' },
                  { value: 'ceo', label: 'CEO' },
                  { value: 'other', label: 'Other' }
                ]}
              />
              <div className="flex gap-2">
                <Select onValueChange={(value) => setValue('countryCode', value)} defaultValue="+91">
                  <SelectTrigger className="w-24 h-10">
                    <SelectValue placeholder="+91" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+91">+91</SelectItem>
                    <SelectItem value="+1">+1</SelectItem>
                    <SelectItem value="+44">+44</SelectItem>
                  </SelectContent>
                </Select>
                <FloatingInput
                  label="Mobile number *"
                  name="mobileNumber"
                  type="tel"
                  value={watch('mobileNumber') || ''}
                  onChange={(e) => setValue('mobileNumber', e.target.value)}
                  error={errors.mobileNumber?.message}
                  containerClassName="flex-1"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save & Continue Button */}
        <div className="flex justify-end pt-6">
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