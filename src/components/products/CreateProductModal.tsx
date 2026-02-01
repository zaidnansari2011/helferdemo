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
  Check
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
  packagingType: z.string().optional(),
  itemsPerPackage: z.union([z.string(), z.number()]).transform(val => {
    if (val === '' || val === null || val === undefined) return 1;
    return typeof val === 'string' ? parseInt(val) || 1 : val;
  }).pipe(z.number().int().min(1).default(1)),
  isHazardous: z.boolean().default(false),
  hazardousType: z.enum(['NONE', 'FLAMMABLE', 'CORROSIVE', 'TOXIC', 'EXPLOSIVE', 'OXIDIZING', 'COMPRESSED_GAS', 'RADIOACTIVE', 'BIOHAZARD']).default('NONE'),
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
  images: z.array(z.string()).default([]),
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
      packagingType: "",
      itemsPerPackage: "" as any,
      isHazardous: false,
      hazardousType: "NONE",
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

  // DEMO MODE: Mock categories
  const categories = [
    { id: "cat1", name: "Tools", fullName: "Tools" },
    { id: "cat2", name: "Electrical", fullName: "Electrical" },
    { id: "cat3", name: "Plumbing", fullName: "Plumbing" },
    { id: "cat4", name: "Safety Equipment", fullName: "Safety Equipment" }
  ];
  const loadingCategories = false;

  // DEMO MODE: Mock file upload
  const uploadFileMutation = {
    mutate: (data: any) => {
      setTimeout(() => {
        const newImages = [...uploadedImages, data.fileData];
        setUploadedImages(newImages);
        toast.success("Image uploaded successfully");
      }, 500);
    },
    isPending: false
  };

  // DEMO MODE: Mock product creation
  const createProductMutation = {
    mutate: async (data: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Product created successfully!");
      form.reset();
      setUploadedImages([]);
      setCurrentStep(0);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    isPending: false
  };

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
    
    const submitData = {
      ...cleanData,
      images: uploadedImages,
      warehouseId: warehouseId || undefined,
    };
    
    console.log('Submitting cleaned data:', submitData);
    createProductMutation.mutate(submitData);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting && !uploadingImage) {
      // If closing, check if user has entered any data
      if (!newOpen) {
        const formValues = form.getValues();
        const hasData = formValues.name || 
                       formValues.description || 
                       formValues.brand || 
                       formValues.manufacturer || 
                       formValues.categoryId || 
                       formValues.basePrice || 
                       uploadedImages.length > 0;
        
        if (hasData) {
          const confirmed = window.confirm(
            "You have unsaved changes. Are you sure you want to close? All your progress will be lost."
          );
          if (!confirmed) {
            return; // Don't close if user cancels
          }
        }
        
        form.reset();
        setUploadedImages([]);
        setCurrentStep(0);
      }
      onOpenChange(newOpen);
    }
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
      <DialogContent className="!max-w-[85vw] !w-[85vw] max-h-[90vh] overflow-y-auto">
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
              <Card>
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

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Images</label>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-full">
                      {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                      {uploadingImage ? "Uploading..." : "Upload Image"}
                    </Button>
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-6 gap-2 mt-4">
                        {uploadedImages.map((url, i) => (
                          <div key={i} className="relative group">
                            <div className="w-16 h-16 border rounded overflow-hidden">
                              <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                            <Button type="button" variant="destructive" size="sm" 
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => removeImage(i)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Pricing & Tax */}
            {currentStep === 1 && (
              <Card>
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
              <Card>
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
              <Card>
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
                onClick={currentStep === 0 ? () => handleOpenChange(false) : prevStep}
                disabled={isSubmitting || uploadingImage}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {currentStep === 0 ? "Cancel" : "Previous"}
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting || loadingCategories || uploadingImage} className="bg-red-600 hover:bg-red-700">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Product
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}



