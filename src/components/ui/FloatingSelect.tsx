"use client"

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FloatingSelectProps {
  label: string
  placeholder?: string
  value?: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
  containerClassName?: string
  required?: boolean
}

export function FloatingSelect({
  label,
  placeholder,
  value,
  onValueChange,
  options,
  error,
  containerClassName,
  required = false
}: FloatingSelectProps) {
  const hasValue = value && value.length > 0

  return (
    <div className={cn("relative", containerClassName)}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger 
          className={cn(
            "h-10 w-full px-3 py-0 flex items-center border border-gray-300 rounded-md text-sm bg-white",
            "focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent",
            error && "border-brand-red focus:ring-brand-red"
          )}
        >
          <SelectValue placeholder=" ">
            {hasValue && <span className="text-sm">{options.find(opt => opt.value === value)?.label}</span>}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label
        className={cn(
          "absolute left-3 bg-white px-1 pointer-events-none",
          "transition-all duration-200",
          hasValue 
            ? "-top-2 text-xs font-medium text-gray-700"
            : "top-2.5 text-sm text-gray-400",
          error && hasValue && "text-brand-red"
        )}
      >
        {label}
      </label>
      {error && (
        <p className="text-brand-red text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
