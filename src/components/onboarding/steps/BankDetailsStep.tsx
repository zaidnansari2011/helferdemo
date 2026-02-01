"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FloatingInput } from "@/components/ui/FloatingInput"
import { FloatingSelect } from "@/components/ui/FloatingSelect"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BankDetailsData, StepComponentProps, OnboardingFormData } from "@/types/onboarding"
import { useState } from "react"

interface BankDetailsStepProps extends StepComponentProps {
  data: BankDetailsData
  updateData: (data: BankDetailsData) => void
  fullFormData: OnboardingFormData
}

export default function BankDetailsStep({ onNext, onBack, data, updateData, fullFormData }: BankDetailsStepProps) {
  const [formData, setFormData] = useState({
    bankAccountNumber: data.bankAccountNumber || '',
    confirmBankAccountNumber: data.confirmBankAccountNumber || '',
    ifscCode: data.ifscCode || '',
    bankType: data.bankType || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.bankAccountNumber) {
      newErrors.bankAccountNumber = 'Bank account number is required'
    } else if (formData.bankAccountNumber.length < 8) {
      newErrors.bankAccountNumber = 'Bank account number must be at least 8 digits'
    }
    
    if (!formData.confirmBankAccountNumber) {
      newErrors.confirmBankAccountNumber = 'Please confirm your bank account number'
    } else if (formData.confirmBankAccountNumber !== formData.bankAccountNumber) {
      newErrors.confirmBankAccountNumber = 'Bank account numbers do not match'
    }
    
    if (!formData.ifscCode) {
      newErrors.ifscCode = 'IFSC code is required'
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      newErrors.ifscCode = 'Please enter a valid IFSC code'
    }
    
    if (!formData.bankType) {
      newErrors.bankType = 'Bank type is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      updateData(formData)
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Bank details</h2>
        <p className="text-sm text-gray-600">Enter your bank account information for payouts</p>
      </div>

      <div className="flex justify-between items-start bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div>
          <div className="text-xs text-gray-500 mb-1">GST number</div>
          <div className="text-sm font-medium">
            {fullFormData.sellerDetails.gstNumber || 'Not provided'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Legal name</div>
          <div className="text-sm font-medium">
            {fullFormData.businessDetails.contactName || 'Not provided'}
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-5">
          <FloatingInput
            label="Bank account number *"
            name="bankAccountNumber"
            value={formData.bankAccountNumber}
            onChange={handleInputChange}
            error={errors.bankAccountNumber}
            required
          />

          <FloatingInput
            label="Re-enter bank account number *"
            name="confirmBankAccountNumber"
            value={formData.confirmBankAccountNumber}
            onChange={handleInputChange}
            error={errors.confirmBankAccountNumber}
            required
          />

          <FloatingInput
            label="IFSC code *"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleInputChange}
            error={errors.ifscCode}
            required
          />

          <FloatingSelect
            label="Bank type *"
            value={formData.bankType}
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, bankType: value }))
              setErrors(prev => ({ ...prev, bankType: '' }))
            }}
            options={[
              { value: 'savings', label: 'Savings Account' },
              { value: 'current', label: 'Current Account' },
              { value: 'cc', label: 'Cash Credit' },
              { value: 'od', label: 'Overdraft' }
            ]}
            error={errors.bankType}
          />
        </div>

        <div className="bg-brand-navy-light border border-brand-navy/20 rounded-lg p-4">
          <p className="text-sm text-brand-navy">
            A small amount will be credited in your bank account to verify your bank account details
          </p>
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
          >
            Save & continue
          </Button>
        </div>
      </form>
    </div>
  )
} 