"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X } from "lucide-react";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

const createVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  price: z.number().min(0, "Price must be positive"),
  attributes: z.record(z.string(), z.string()).optional(),
});

type CreateVariantFormData = z.infer<typeof createVariantSchema>;

interface VariantCreateModalProps {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VariantCreateModal({ 
  productId, 
  open, 
  onOpenChange, 
  onSuccess 
}: VariantCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attributeKey, setAttributeKey] = useState("");
  const [attributeValue, setAttributeValue] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  const form = useForm<CreateVariantFormData>({
    resolver: zodResolver(createVariantSchema),
    defaultValues: {
      name: "",
      price: 0,
      attributes: {},
    },
  });

  const createVariantMutation = useMutation(trpc.inventoryProducts.variants.create.mutationOptions({
    onSuccess: () => {
      toast.success("Variant created successfully!");
      form.reset();
      setAttributes({});
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create variant");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  }));

  const onSubmit = async (data: CreateVariantFormData) => {
    setIsSubmitting(true);
    
    createVariantMutation.mutate({
      productId,
      ...data,
      attributes,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
        setAttributes({});
        setAttributeKey("");
        setAttributeValue("");
      }
    }
  };

  const addAttribute = () => {
    if (attributeKey.trim() && attributeValue.trim()) {
      setAttributes(prev => ({
        ...prev,
        [attributeKey.trim()]: attributeValue.trim()
      }));
      setAttributeKey("");
      setAttributeValue("");
    }
  };

  const removeAttribute = (key: string) => {
    setAttributes(prev => {
      const newAttributes = { ...prev };
      delete newAttributes[key];
      return newAttributes;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAttribute();
    }
  };

  // Common attribute suggestions for hardware products
  const commonAttributes = [
    { key: "size", suggestions: ["Small", "Medium", "Large", "XL"] },
    { key: "material", suggestions: ["Steel", "Plastic", "Wood", "Aluminum"] },
    { key: "color", suggestions: ["Black", "White", "Silver", "Brown"] },
    { key: "length", suggestions: ["10mm", "20mm", "50mm", "100mm"] },
    { key: "width", suggestions: ["5mm", "10mm", "15mm", "20mm"] },
    { key: "voltage", suggestions: ["12V", "24V", "110V", "220V"] },
    { key: "wattage", suggestions: ["5W", "10W", "25W", "40W", "60W"] },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-[60vw] !w-[60vw]">
        <DialogHeader>
          <DialogTitle>Create Product Variant</DialogTitle>
          <DialogDescription>
            Add a new variant for this product with specific attributes and pricing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10mm x 50mm, Large, Blue" {...field} />
                    </FormControl>
                    <FormDescription>
                      Descriptive name for this variant
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="99.99" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Price for this specific variant
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Attributes Section */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Product Attributes</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Add specific attributes for this variant (size, color, material, etc.)
                </p>
                
                {/* Current Attributes */}
                {Object.keys(attributes).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(attributes).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="px-2 py-1">
                        {key}: {value}
                        <button
                          type="button"
                          onClick={() => removeAttribute(key)}
                          className="ml-2 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Attribute */}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Attribute name (e.g., size)"
                    value={attributeKey}
                    onChange={(e) => setAttributeKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Input
                    placeholder="Value (e.g., Large)"
                    value={attributeValue}
                    onChange={(e) => setAttributeValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAttribute}
                    disabled={!attributeKey.trim() || !attributeValue.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>

                {/* Common Attribute Suggestions */}
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Common attributes:</p>
                  <div className="flex flex-wrap gap-1">
                    {commonAttributes.map((attr) => (
                      <Button
                        key={attr.key}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setAttributeKey(attr.key)}
                      >
                        {attr.key}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-generated fields info */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Auto-generated</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">SKU:</span> Will be auto-generated
                </div>
                <div>
                  <span className="font-medium">Barcode:</span> Will be auto-generated
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Variant
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 