"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { DigitalSignatureData, StepComponentProps } from "@/types/onboarding"
import { useRef, useState, useEffect } from "react"

interface DigitalSignatureStepProps extends StepComponentProps {
  data: DigitalSignatureData
  updateData: (data: DigitalSignatureData) => void
}

export default function DigitalSignatureStep({ onNext, onBack, data, updateData }: DigitalSignatureStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  
  const { handleSubmit } = useForm<DigitalSignatureData>({
    defaultValues: data
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Set drawing styles
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'
  }, [])

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

  const onSubmit = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const signatureData = canvas.toDataURL()
    updateData({ signature: signatureData })
    onNext()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Draw Signature</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          {/* Signature Canvas */}
          <div className="border-2 border-gray-300 rounded-lg bg-white relative">
            <canvas
              ref={canvasRef}
              className="w-full h-80 cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
            
            {/* Clear button positioned in top right */}
            <Button
              type="button"
              variant="outline"
              onClick={clearSignature}
              className="absolute top-4 right-4 text-gray-600 border-gray-300"
            >
              Clear
            </Button>
          </div>

          {/* Signature Agreement */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            </div>
            <p className="text-sm text-gray-700">
              By signing this document with an electronic signature, I agree that this signature will be as valid as handwritten signatures.
            </p>
          </div>
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
            disabled={!hasSignature}
          >
            Save & continue
          </Button>
        </div>
      </form>
    </div>
  )
} 