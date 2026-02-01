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
import { Button } from "@/components/ui/button";
import { Loader2, Layers, Grid3X3, Package, Box, QrCode } from "lucide-react";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

type HierarchyLevel = "floorPlan" | "area" | "rack" | "shelf" | "bin";

const schemas = {
  floorPlan: z.object({
    floor: z.string().min(1, "Floor is required"),
  }),
  area: z.object({
    code: z.string().min(1, "Area code is required"),
    name: z.string().min(1, "Area name is required"),
  }),
  rack: z.object({
    number: z.string().min(1, "Rack number is required"),
  }),
  shelf: z.object({
    level: z.number().int().positive("Shelf level must be positive"),
  }),
  bin: z.object({
    code: z.string().min(1, "Bin code is required"),
  }),
};

interface HierarchyCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: HierarchyLevel | null;
  parentId: string | null;
  parentData?: any;
  onSuccess?: () => void;
}

export function HierarchyCreateModal({ 
  open, 
  onOpenChange, 
  type, 
  parentId, 
  parentData,
  onSuccess 
}: HierarchyCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getFormSchema = () => {
    if (!type) return z.object({});
    return schemas[type];
  };

  const form = useForm({
    resolver: zodResolver(getFormSchema() as any),
    defaultValues: getDefaultValues() as any,
  });

  function getDefaultValues() {
    switch (type) {
      case "floorPlan":
        return { floor: "" };
      case "area":
        return { code: "", name: "" };
      case "rack":
        return { number: "" };
      case "shelf":
        return { level: 1 };
      case "bin":
        return { code: "" };
      default:
        return {};
    }
  }

  const mutations = {
    floorPlan: useMutation(trpc.warehouse.floorPlan.create.mutationOptions()),
    area: useMutation(trpc.warehouse.area.create.mutationOptions()),
    rack: useMutation(trpc.warehouse.rack.create.mutationOptions()),
    shelf: useMutation(trpc.warehouse.shelf.create.mutationOptions()),
    bin: useMutation(trpc.warehouse.bin.create.mutationOptions()),
  };

  const onSubmit = async (data: any) => {
    if (!type || !parentId) return;

    setIsSubmitting(true);

    try {
      let payload;
      switch (type) {
        case "floorPlan":
          payload = { warehouseId: parentId, ...data };
          break;
        case "area":
          payload = { floorPlanId: parentId, ...data };
          break;
        case "rack":
          payload = { areaId: parentId, ...data };
          break;
        case "shelf":
          payload = { rackId: parentId, ...data };
          break;
        case "bin":
          payload = { shelfId: parentId, ...data };
          break;
        default:
          return;
      }

      await mutations[type].mutateAsync(payload);
      toast.success(`${getTypeLabel()} created successfully!`);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || `Failed to create ${getTypeLabel().toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case "floorPlan": return "Floor Plan";
      case "area": return "Area";
      case "rack": return "Rack";
      case "shelf": return "Shelf";
      case "bin": return "Bin";
      default: return "";
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case "floorPlan": return <Layers className="h-5 w-5" />;
      case "area": return <Grid3X3 className="h-5 w-5" />;
      case "rack": return <Package className="h-5 w-5" />;
      case "shelf": return <Box className="h-5 w-5" />;
      case "bin": return <QrCode className="h-5 w-5" />;
      default: return null;
    }
  };

  const getLocationContext = () => {
    if (!parentData) return "";
    
    const context = [];
    if (parentData.floor) context.push(`Floor ${parentData.floor}`);
    if (parentData.area) context.push(`Area ${parentData.area}`);
    if (parentData.rack) context.push(`Rack ${parentData.rack}`);
    if (parentData.shelf) context.push(`Shelf ${parentData.shelf}`);
    
    return context.join(" → ");
  };

  if (!type || !open) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-[60vw] !w-[60vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            Create New {getTypeLabel()}
          </DialogTitle>
          <DialogDescription>
            {getLocationContext() && (
              <span className="block text-sm font-medium text-blue-600 mb-1">
                {getLocationContext()}
              </span>
            )}
            Add a new {getTypeLabel().toLowerCase()} to your warehouse structure.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {type === "floorPlan" && (
              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Identifier</FormLabel>
                    <FormControl>
                      <Input placeholder="L0, L1, B1, etc." {...field} />
                    </FormControl>
                    <FormDescription>
                      Use standard floor naming (L0 for ground, L1 for first, B1 for basement)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {type === "area" && (
              <>
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="A10, B05, etc." 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Short identifier for the area (e.g., A10, B05)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Electronics, Hardware, Tools, etc." {...field} />
                      </FormControl>
                      <FormDescription>
                        Descriptive name for easy identification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {type === "rack" && (
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rack Number</FormLabel>
                    <FormControl>
                      <Input placeholder="001, 002, 003, etc." {...field} />
                    </FormControl>
                    <FormDescription>
                      Use 3-digit numbers for consistency (001, 002, 003)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {type === "shelf" && (
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shelf Level</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="1, 2, 3, etc."
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      Shelf level from bottom (1) to top
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {type === "bin" && (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bin Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="A, B, C, etc." 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>
                      Single letter or short code (A, B, C or A1, A2)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
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
                Create {getTypeLabel()}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 