"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  ImagePlus, 
  X, 
  Package, 
  FileText, 
  AlertTriangle, 
  Truck, 
  Receipt,
  ChevronLeft,
  ChevronRight,
  Check,
  Info
} from "lucide-react";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";

// Schema matching backend - accepts strings and numbers, transforms to proper types
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Description is required"),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  basePrice: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseFloat(val) || 0 : val;
  }).pipe(z.number().min(0, "Price must be positive")),
  taxInclusive: z.boolean().default(false),
  gstRate: z.number().min(0).max(28).default(18),
  cessPercentage: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseFloat(val) || 0 : val;
  }).pipe(z.number().min(0).default(0)),
  hsnCode: z.string().optional(),
  unitOfMeasure: z.enum(['PIECE', 'KG', 'GRAM', 'LITER', 'ML', 'BOX', 'CARTON', 'PACK', 'DOZEN', 'METER', 'SQFT']).default('PIECE'),
  weight: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return undefined;
    return typeof val === 'string' ? parseFloat(val) || undefined : val;
  }).optional(),
  dimensionUnit: z.enum(['MM', 'CM', 'M', 'INCH', 'FEET']).default('CM').optional(),
  dimensions: z.string().optional(),
  packagingType: z.string().optional(),
  itemsPerPackage: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 1;
    return typeof val === 'string' ? parseInt(val) || 1 : val;
  }).pipe(z.number().int().min(1).default(1)),
  isHazardous: z.boolean().default(false),
  hazardousType: z.enum(['NONE', 'FLAMMABLE', 'CORROSIVE', 'TOXIC', 'EXPLOSIVE', 'OXIDIZING', 'COMPRESSED_GAS', 'RADIOACTIVE', 'BIOHAZARD']).default('NONE'),
  msdsDocument: z.string().url().optional().or(z.literal('')),
  countryOfOrigin: z.string().default('India'),
  requiresBatchTracking: z.boolean().default(false),
  shelfLifeDays: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return undefined;
    return typeof val === 'string' ? parseInt(val) || undefined : val;
  }).optional(),
  coldChainRequired: z.enum(['NONE', 'CHILLED', 'FROZEN', 'AMBIENT']).default('NONE'),
  pickupInstructions: z.string().optional(),
  storageConditions: z.string().optional(),
  minimumOrderQty: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 1;
    return typeof val === 'string' ? parseInt(val) || 1 : val;
  }).pipe(z.number().int().min(1).default(1)),
  leadTimeDays: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseInt(val) || 0 : val;
  }).pipe(z.number().int().min(0).default(0)),
  manufacturerPartNumber: z.string().optional(),
  reorderLevel: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 10;
    return typeof val === 'string' ? parseInt(val) || 10 : val;
  }).pipe(z.number().int().min(0).default(10)),
  warrantyMonths: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 0;
    return typeof val === 'string' ? parseInt(val) || 0 : val;
  }).pipe(z.number().int().min(0).default(0)),
  isReturnable: z.boolean().default(true),
  returnWindowDays: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 7;
    return typeof val === 'string' ? parseInt(val) || 7 : val;
  }).pipe(z.number().int().min(1).default(7)),
  requiresEInvoice: z.boolean().default(true),
  images: z.array(z.string()).min(5, "Minimum 5 product images are required").default([]),
  status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']).default('DRAFT'),
  certificates: z.array(z.string()).default([]),
  productDocuments: z.array(z.string()).default([]),
  warehouseId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const STEPS = [
  { id: 'basic', label: 'Basic', icon: Package },
  { id: 'pricing', label: 'Pricing', icon: Receipt },
  { id: 'compliance', label: 'Compliance', icon: AlertTriangle },
  { id: 'logistics', label: 'Logistics', icon: Truck },
];

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  warehouseId?: string;
}

export function CreateProductModal({ open, onOpenChange, onSuccess, warehouseId }: CreateProductModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      brand: "",
      manufacturer: "",
      categoryId: "",
      basePrice: "" as any,
      taxInclusive: false,
      gstRate: 18,
      cessPercentage: "" as any,
      hsnCode: "",
      unitOfMeasure: "PIECE",
      weight: "" as any,
      dimensionUnit: "CM",
      dimensions: "",
      packagingType: "",
      itemsPerPackage: "" as any,
      isHazardous: false,
      hazardousType: "NONE",
      msdsDocument: "",
      countryOfOrigin: "India",
      requiresBatchTracking: false,
      shelfLifeDays: "" as any,
      coldChainRequired: "NONE",
      pickupInstructions: "",
      storageConditions: "",
      minimumOrderQty: "" as any,
      leadTimeDays: "" as any,
      manufacturerPartNumber: "",
      reorderLevel: "" as any,
      warrantyMonths: "" as any,
      isReturnable: true,
      returnWindowDays: "" as any,
      requiresEInvoice: true,
      images: [],
      status: "DRAFT",
      certificates: [],
      productDocuments: [],
      warehouseId: warehouseId || "",
    },
  });

  // Fetch real categories from database
  const { data: categoriesData, isLoading: loadingCategories } = useQuery(
    trpc.products.getCategories.queryOptions()
  );
  const categories = categoriesData || [];

  // Real file upload mutation
  const uploadFileMutation = useMutation(
    trpc.seller.uploadFile.mutationOptions({
      onSuccess: (data) => {
        const newImages = [...uploadedImages, data.url];
        setUploadedImages(newImages);
        toast.success("Image uploaded successfully");
        setUploadingImage(false);
      },
      onError: (error) => {
        toast.error("Failed to upload image", {
          description: error.message || "Please try again"
        });
        setUploadingImage(false);
      },
    })
  );

  // Real product creation mutation
  const createProductMutation = useMutation(
    trpc.inventoryProducts.create.mutationOptions({
      onSuccess: () => {
        toast.success("Product created successfully!");
        form.reset();
        setUploadedImages([]);
        setCurrentStep(0);
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error("Failed to create product", {
          description: error.message || "Please try again"
        });
        setIsSubmitting(false);
      },
    })
  );

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const base64WithoutPrefix = base64Data.split(',')[1];

        uploadFileMutation.mutate({
          fileName: file.name,
          fileType: file.type,
          fileData: base64WithoutPrefix,
          folder: "product-images",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read image file");
      setUploadingImage(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    form.setValue("images", newImages);
  };

  const onSubmit = (data: ProductFormValues) => {
    console.log('Form submitted with data:', data);
    
    // Validate minimum images
    if (uploadedImages.length < 5) {
      toast.error("Please upload at least 5 product images", {
        description: `You have uploaded ${uploadedImages.length} image${uploadedImages.length !== 1 ? 's' : ''}. ${5 - uploadedImages.length} more required.`,
        duration: 5000,
      });
      setCurrentStep(0); // Go back to first step where images are
      return;
    }
    
    setIsSubmitting(true);
    
    // Clean up data - convert empty strings to undefined for optional number fields
    const cleanData: any = { ...data };
    
    // Convert empty string numbers to actual numbers or undefined
    const numericFields = [
      'basePrice', 'weight', 'itemsPerPackage', 'shelfLifeDays', 
      'minimumOrderQty', 'leadTimeDays', 'reorderLevel', 
      'warrantyMonths', 'returnWindowDays', 'cessPercentage'
    ];
    
    numericFields.forEach(field => {
      if (cleanData[field] === '' || cleanData[field] === null) {
        if (field === 'basePrice' || field === 'itemsPerPackage' || field === 'minimumOrderQty' || field === 'returnWindowDays') {
          // Required fields - set to 1 or appropriate default
          cleanData[field] = field === 'basePrice' ? 0 : 1;
        } else {
          // Optional fields
          cleanData[field] = undefined;
        }
      } else if (typeof cleanData[field] === 'string') {
        cleanData[field] = parseFloat(cleanData[field]);
      }
    });
    
    // Transform dimensions from string to object format expected by backend
    // Frontend: "10 × 5 × 3" -> Backend: { length: 10, width: 5, height: 3, unit: "cm" }
    let dimensionsObject = undefined;
    if (cleanData.dimensions && cleanData.dimensions.trim() !== '') {
      const dimensionParts = cleanData.dimensions.split('×').map((d: string) => parseFloat(d.trim()));
      if (dimensionParts.length === 3 && dimensionParts.every((d: number) => !isNaN(d) && d > 0)) {
        dimensionsObject = {
          length: dimensionParts[0],
          width: dimensionParts[1],
          height: dimensionParts[2],
          unit: cleanData.dimensionUnit?.toLowerCase() || 'cm',
        };
      }
    }
    
    // Remove frontend-only fields and add backend-compatible data
    const { dimensions, dimensionUnit, ...backendData } = cleanData;
    
    const submitData = {
      ...backendData,
      dimensions: dimensionsObject,
      images: uploadedImages,
      warehouseId: warehouseId || undefined,
    };
    
    console.log('Submitting cleaned data:', submitData);
    createProductMutation.mutate(submitData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting && !uploadingImage) {
      if (!newOpen) {
        // This is triggered by the X button, not the Cancel button
        // Check if there's any unsaved data
        const formValues = form.getValues();
        const hasData = formValues.name || 
                       formValues.description || 
                       formValues.brand || 
                       formValues.manufacturer || 
                       formValues.categoryId || 
                       formValues.basePrice || 
                       uploadedImages.length > 0;
        
        if (hasData) {
          // Silently prevent closing - user must use Cancel button
          return;
        }
        
        form.reset();
        setUploadedImages([]);
        setCurrentStep(0);
      }
      onOpenChange(newOpen);
    }
  };

  const handleInteractOutside = (e: Event) => {
    // Check if there's any unsaved data
    const formValues = form.getValues();
    const hasData = formValues.name || 
                   formValues.description || 
                   formValues.brand || 
                   formValues.manufacturer || 
                   formValues.categoryId || 
                   formValues.basePrice || 
                   uploadedImages.length > 0;
    
    if (hasData || isSubmitting || uploadingImage) {
      e.preventDefault();
      // Silently prevent closing - user must use Cancel button
    }
  };

  const handleCancelClick = () => {
    const formValues = form.getValues();
    const hasData = formValues.name || 
                   formValues.description || 
                   formValues.brand || 
                   formValues.manufacturer || 
                   formValues.categoryId || 
                   formValues.basePrice || 
                   uploadedImages.length > 0;
    
    if (hasData) {
      setShowCancelConfirm(true);
    } else {
      form.reset();
      setUploadedImages([]);
      setCurrentStep(0);
      onOpenChange(false);
    }
  };

  const handleConfirmCancel = () => {
    form.reset();
    setUploadedImages([]);
    setCurrentStep(0);
    setShowCancelConfirm(false);
    onOpenChange(false);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const flattenedCategories = categories
    ?.filter(category => !category.parentId)
    ?.reduce((acc: Array<{id: string, name: string, fullName: string}>, category) => {
      if (category.children && category.children.length > 0) {
        category.children.forEach(subcategory => {
          acc.push({
            id: subcategory.id,
            name: subcategory.name,
            fullName: `${category.name} > ${subcategory.name}`,
          });
        });
      } else {
        acc.push({ id: category.id, name: category.name, fullName: category.name });
      }
      return acc;
    }, []) || [];

  const GST_RATES = [
    { value: 0, label: "0% (Exempt)" },
    { value: 5, label: "5%" },
    { value: 12, label: "12%" },
    { value: 18, label: "18%" },
    { value: 28, label: "28%" },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="!max-w-5xl !w-full !max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300"
        onInteractOutside={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="text-xl text-red-600">Add New Product</DialogTitle>
          <DialogDescription>
            Product Code & SKU will be auto-generated. Fill all required fields marked with *
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div 
                  className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all ${
                    isActive ? 'bg-red-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                </div>
                <div className="ml-2">
                  <p className={`text-sm font-medium ${isActive ? 'text-red-600' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 rounded ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Basic Info */}
            {currentStep === 0 && (
              <Card className="animate-in fade-in-0 slide-in-from-right-5 duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl><Input placeholder="e.g., Phillips Head Screw M6x20" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {loadingCategories ? <div className="p-2 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div> : 
                              flattenedCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.fullName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="brand" render={({ field }) => (
                      <FormItem><FormLabel>Brand</FormLabel><FormControl><Input placeholder="e.g., Bosch" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="manufacturer" render={({ field }) => (
                      <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Bosch India" {...field} /></FormControl></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl><Textarea placeholder="Detailed description..." className="min-h-[100px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="manufacturerPartNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer Part Number (MPN)</FormLabel>
                      <FormControl><Input placeholder="e.g., BOS-PHD-M6X20" {...field} /></FormControl>
                      <FormDescription>Manufacturer's unique identifier</FormDescription>
                    </FormItem>
                  )} />

                  {/* Product Dimensions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Dimensions</label>
                    <div className="grid grid-cols-4 gap-3">
                      <FormField control={form.control} name="dimensionUnit" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-gray-600">Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MM">mm</SelectItem>
                              <SelectItem value="CM">cm</SelectItem>
                              <SelectItem value="M">m</SelectItem>
                              <SelectItem value="INCH">inch</SelectItem>
                              <SelectItem value="FEET">feet</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <div className="col-span-3">
                        <FormField control={form.control} name="dimensions" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-gray-600">Dimensions (L × W × H)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 10 × 5 × 3" {...field} />
                            </FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    <FormDescription className="text-xs">Enter product dimensions for shipping calculations</FormDescription>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Product Images *</label>
                        <div className="group relative">
                          <Info className="h-4 w-4 text-blue-500 cursor-help" />
                          <div className="absolute left-0 top-6 w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div className="font-semibold mb-2">Image Requirements:</div>
                            <ul className="space-y-1 list-disc list-inside">
                              <li><strong>Minimum:</strong> 5 images required</li>
                              <li><strong>Resolution:</strong> 1200x1200px (recommended)</li>
                              <li><strong>Minimum size:</strong> 800x800px</li>
                              <li><strong>Format:</strong> JPG, PNG, or WebP</li>
                              <li><strong>Max file size:</strong> 5MB per image</li>
                              <li><strong>Aspect ratio:</strong> Square (1:1) preferred</li>
                            </ul>
                            <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                              Tip: Use high-quality, well-lit photos from multiple angles
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-semibold ${
                        uploadedImages.length >= 5 
                          ? 'text-green-600' 
                          : uploadedImages.length > 0 
                            ? 'text-orange-600' 
                            : 'text-red-600'
                      }`}>
                        {uploadedImages.length}/5 images
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          uploadedImages.length >= 5 
                            ? 'bg-green-500' 
                            : uploadedImages.length > 0 
                              ? 'bg-orange-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${(uploadedImages.length / 5) * 100}%` }}
                      />
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <div className="flex gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={uploadingImage} 
                        className="flex-1 h-11 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                      >
                        {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                        {uploadingImage ? "Uploading..." : "Upload Image"}
                      </Button>
                      <div className={`flex items-center justify-center px-4 h-11 rounded-md border-2 transition-all duration-300 ${
                        uploadedImages.length >= 5 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-orange-500 bg-orange-50 text-orange-700'
                      }`}>
                        <span className="font-semibold text-sm">
                          {uploadedImages.length < 5 ? `${5 - uploadedImages.length} more needed` : 'Complete ✓'}
                        </span>
                      </div>
                    </div>
                    
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-5 gap-3 mt-4">
                        {uploadedImages.map((url, i) => (
                          <div key={i} className="relative group animate-in fade-in-0 zoom-in-95 duration-200" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className={`w-full aspect-square border-2 rounded-lg overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg ${
                              i === 0 ? 'border-blue-500' : 'border-gray-300'
                            }`}>
                              <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                            {i === 0 && (
                              <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                                Main
                              </div>
                            )}
                            <Button type="button" variant="destructive" size="sm" 
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(i)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        {/* Empty placeholders to show remaining required images */}
                        {uploadedImages.length < 5 && Array.from({ length: 5 - uploadedImages.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 transition-all duration-200 hover:border-gray-400 hover:bg-gray-100">
                            <ImagePlus className="h-6 w-6 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {uploadedImages.length === 0 && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                        <div className="text-center">
                          <ImagePlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600 mb-1">No images uploaded yet</p>
                          <p className="text-xs text-gray-500">Click the button above to upload your first image</p>
                        </div>
                      </div>
                    )}
                    
                    {uploadedImages.length > 0 && uploadedImages.length < 5 && (
                      <p className="text-xs text-orange-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Please upload {5 - uploadedImages.length} more image{5 - uploadedImages.length !== 1 ? 's' : ''} to meet the minimum requirement
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Pricing & Tax */}
            {currentStep === 1 && (
              <Card className="animate-in fade-in-0 slide-in-from-right-5 duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Pricing & GST</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="basePrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (₹) *</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} value={field.value === undefined ? '' : field.value} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="gstRate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Rate *</FormLabel>
                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {GST_RATES.map((r) => <SelectItem key={r.value} value={r.value.toString()}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="cessPercentage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cess %</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                        <FormDescription>Additional cess</FormDescription>
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="hsnCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>HSN/SAC Code</FormLabel>
                        <FormControl><Input placeholder="e.g., 73181500" {...field} /></FormControl>
                        <FormDescription>Mandatory for GST compliance</FormDescription>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="taxInclusive" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Tax Inclusive Price</FormLabel>
                          <FormDescription>Price includes GST?</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="requiresEInvoice" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>E-Invoice Required (IRN)</FormLabel>
                        <FormDescription>Generate Invoice Reference Number</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="unitOfMeasure" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit of Measure *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="PIECE">Piece</SelectItem>
                            <SelectItem value="KG">Kilogram</SelectItem>
                            <SelectItem value="GRAM">Gram</SelectItem>
                            <SelectItem value="LITER">Liter</SelectItem>
                            <SelectItem value="ML">Milliliter</SelectItem>
                            <SelectItem value="BOX">Box</SelectItem>
                            <SelectItem value="CARTON">Carton</SelectItem>
                            <SelectItem value="PACK">Pack</SelectItem>
                            <SelectItem value="DOZEN">Dozen</SelectItem>
                            <SelectItem value="METER">Meter</SelectItem>
                            <SelectItem value="SQFT">Square Feet</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="weight" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.001" placeholder="" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="itemsPerPackage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Items/Package</FormLabel>
                        <FormControl><Input type="number" placeholder="1" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="packagingType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Packaging Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select packaging" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="carton">Carton</SelectItem>
                          <SelectItem value="pallet">Pallet</SelectItem>
                          <SelectItem value="bag">Bag</SelectItem>
                          <SelectItem value="bottle">Bottle</SelectItem>
                          <SelectItem value="can">Can</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Compliance */}
            {currentStep === 2 && (
              <Card className="animate-in fade-in-0 slide-in-from-right-5 duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Regulatory & Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="countryOfOrigin" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country of Origin</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="China">China</SelectItem>
                            <SelectItem value="USA">United States</SelectItem>
                            <SelectItem value="Germany">Germany</SelectItem>
                            <SelectItem value="Japan">Japan</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="shelfLifeDays" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shelf Life (Days)</FormLabel>
                        <FormControl><Input type="number" placeholder="" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                        <FormDescription>For perishables</FormDescription>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="isHazardous" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-yellow-50">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600" />Hazardous Material</FormLabel>
                        <FormDescription>Special handling required?</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />

                  {form.watch("isHazardous") && (
                    <FormField control={form.control} name="hazardousType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hazard Classification *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="FLAMMABLE">🔥 Flammable</SelectItem>
                            <SelectItem value="CORROSIVE">⚗️ Corrosive</SelectItem>
                            <SelectItem value="TOXIC">☠️ Toxic</SelectItem>
                            <SelectItem value="EXPLOSIVE">💥 Explosive</SelectItem>
                            <SelectItem value="OXIDIZING">🔴 Oxidizing</SelectItem>
                            <SelectItem value="COMPRESSED_GAS">🫧 Compressed Gas</SelectItem>
                            <SelectItem value="RADIOACTIVE">☢️ Radioactive</SelectItem>
                            <SelectItem value="BIOHAZARD">☣️ Biohazard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="requiresBatchTracking" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Batch/Lot Tracking</FormLabel>
                        <FormDescription>Track by batch numbers</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="warrantyMonths" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty (Months)</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="returnWindowDays" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Window (Days)</FormLabel>
                        <FormControl><Input type="number" placeholder="7" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="isReturnable" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Returnable</FormLabel>
                        <FormDescription>Can be returned?</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* Step 4: Logistics */}
            {currentStep === 3 && (
              <Card className="animate-in fade-in-0 slide-in-from-right-5 duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Logistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="coldChainRequired" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cold Chain Requirement</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">❌ None - Room Temp</SelectItem>
                          <SelectItem value="AMBIENT">🌡️ Ambient - Controlled</SelectItem>
                          <SelectItem value="CHILLED">❄️ Chilled (0-4°C)</SelectItem>
                          <SelectItem value="FROZEN">🧊 Frozen (-18°C)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>For delivery riders to use insulated bags</FormDescription>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="pickupInstructions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Instructions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Fragile - pack separately, Check seal..." className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormDescription>Notes for warehouse pickers</FormDescription>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="storageConditions" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Conditions</FormLabel>
                      <FormControl><Input placeholder="e.g., Keep dry, Away from sunlight" {...field} /></FormControl>
                    </FormItem>
                  )} />

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="minimumOrderQty" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Order Qty (MOQ)</FormLabel>
                        <FormControl><Input type="number" placeholder="1" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="leadTimeDays" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Time (Days)</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                        <FormDescription>To fulfill order</FormDescription>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="reorderLevel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reorder Level</FormLabel>
                        <FormControl><Input type="number" placeholder="10" {...field} onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))} value={field.value === undefined || field.value === '' ? '' : field.value} /></FormControl>
                        <FormDescription>Stock alert</FormDescription>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">📝 Draft</SelectItem>
                          <SelectItem value="ACTIVE">✅ Active</SelectItem>
                          <SelectItem value="OUT_OF_STOCK">⚠️ Out of Stock</SelectItem>
                          <SelectItem value="DISCONTINUED">🚫 Discontinued</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 0 ? handleCancelClick : prevStep}
                disabled={isSubmitting || uploadingImage}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {currentStep === 0 ? "Cancel" : "Previous"}
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep} className="transition-all duration-200 hover:scale-105 active:scale-95">
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || loadingCategories || uploadingImage} className="bg-red-600 hover:bg-red-700 transition-all duration-200 hover:scale-105 active:scale-95">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Product
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-gray-900">
              Discard Product Creation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              All your unsaved changes will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel 
              className="border-gray-300 hover:bg-gray-50"
              onClick={() => setShowCancelConfirm(false)}
            >
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmCancel}
            >
              Yes, Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}



