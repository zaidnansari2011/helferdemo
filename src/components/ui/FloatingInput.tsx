"use client"

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface FloatingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  containerClassName?: string
}

export function FloatingInput({
  label,
  name,
  value,
  onChange,
  error,
  containerClassName,
  className,
  ...props
}: FloatingInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full h-10 px-3 border border-gray-300 rounded-md text-sm bg-white",
          "focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent",
          "transition-all duration-200",
          "peer placeholder-transparent",
          error && "border-brand-red focus:ring-brand-red",
          className
        )}
        placeholder={label}
        {...props}
      />
      <label
        htmlFor={name}
        className={cn(
          "absolute left-3 -top-2 text-xs font-medium bg-white px-1",
          "transition-all duration-200 pointer-events-none",
          "peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2.5 peer-placeholder-shown:left-3",
          "peer-focus:-top-2 peer-focus:left-3 peer-focus:text-xs peer-focus:text-brand-navy",
          error ? "text-brand-red peer-placeholder-shown:text-gray-400" : "text-gray-700 peer-placeholder-shown:text-gray-400"
        )}
      >
        {label}
      </label>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}

interface FloatingTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  error?: string
  containerClassName?: string
}

export function FloatingTextarea({
  label,
  name,
  value,
  onChange,
  error,
  containerClassName,
  className,
  ...props
}: FloatingTextareaProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white",
          "focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent",
          "transition-all duration-200 resize-none",
          "peer placeholder-transparent",
          error && "border-brand-red focus:ring-brand-red",
          className
        )}
        placeholder={label}
        {...props}
      />
      <label
        htmlFor={name}
        className={cn(
          "absolute left-3 -top-2 text-xs font-medium bg-white px-1",
          "transition-all duration-200 pointer-events-none",
          "peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-2 peer-placeholder-shown:left-3",
          "peer-focus:-top-2 peer-focus:left-3 peer-focus:text-xs peer-focus:text-brand-navy",
          error ? "text-brand-red peer-placeholder-shown:text-gray-400" : "text-gray-700 peer-placeholder-shown:text-gray-400"
        )}
      >
        {label}
      </label>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  )
}
