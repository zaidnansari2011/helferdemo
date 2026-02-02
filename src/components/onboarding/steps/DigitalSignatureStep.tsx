"use client"

import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { DigitalSignatureData, StepComponentProps } from "@/types/onboarding"
import { useRef, useState, useEffect } from "react"
import { Upload } from "lucide-react"

interface DigitalSignatureStepProps extends StepComponentProps {
  data: DigitalSignatureData
  updateData: (data: DigitalSignatureData) => void
}

export default function DigitalSignatureStep({ onNext, onBack, data, updateData }: DigitalSignatureStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
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
  }, [signatureMode])

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (pdf, doc, docx, jpg, png)
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid document (PDF, DOC, DOCX, JPG, or PNG)')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      
      setUploadedFile(file)
      setHasSignature(true)
    }
  }

  const removeUploadedFile = () => {
    setUploadedFile(null)
    setHasSignature(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = () => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current
      if (!canvas) return

      const signatureData = canvas.toDataURL()
      updateData({ signature: signatureData })
    } else {
      // For uploaded files, convert to base64
      if (uploadedFile) {
        const reader = new FileReader()
        reader.onloadend = () => {
          updateData({ signature: reader.result as string })
          onNext()
        }
        reader.readAsDataURL(uploadedFile)
        return
      }
    }
    onNext()
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Digital Signature</h2>
        <p className="text-sm text-gray-600">Choose to draw your signature or upload a document</p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-4 border-b">
        <button
          type="button"
          onClick={() => {
            setSignatureMode('draw')
            setUploadedFile(null)
            setHasSignature(false)
          }}
          className={`pb-3 px-4 font-medium transition-colors ${
            signatureMode === 'draw'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => {
            setSignatureMode('upload')
            clearSignature()
            setHasSignature(false)
          }}
          className={`pb-3 px-4 font-medium transition-colors ${
            signatureMode === 'upload'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload Document
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          {signatureMode === 'draw' ? (
            <>
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
            </>
          ) : (
            <>
              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white p-8">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="signature-upload"
                />
                
                {!uploadedFile ? (
                  <label
                    htmlFor="signature-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Click to upload signature document
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, JPG, or PNG (max 5MB)
                    </p>
                  </label>
                ) : (
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                        <Upload className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={removeUploadedFile}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Signature Agreement */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            </div>
            <p className="text-sm text-gray-700">
              By {signatureMode === 'draw' ? 'signing this document with an electronic signature' : 'uploading this document'}, I agree that this {signatureMode === 'draw' ? 'signature' : 'document'} will be as valid as handwritten signatures.
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