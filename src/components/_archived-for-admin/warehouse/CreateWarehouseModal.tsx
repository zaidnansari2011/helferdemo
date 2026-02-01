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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";

const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  pincode: z.string().optional().default("000000"),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  shippingLocationId: z.string().min(1, "Shipping location is required"),
});

type CreateWarehouseFormData = z.infer<typeof createWarehouseSchema>;

interface CreateWarehouseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateWarehouseModal({ open, onOpenChange, onSuccess }: CreateWarehouseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateWarehouseFormData>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: {
      name: "",
      code: "",
      pincode: "000000",
      latitude: 0,
      longitude: 0,
      shippingLocationId: "",
    },
  });

  const { data: shippingLocations, isLoading: loadingLocations } = useQuery(trpc.warehouse.getShippingLocations.queryOptions())

  const createWarehouseMutation = useMutation(trpc.warehouse.create.mutationOptions({
    onSuccess: () => {
      toast.success("Warehouse created successfully!");
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create warehouse");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  }));

  const onSubmit = async (data: CreateWarehouseFormData) => {
    console.log("Form submitted with data:", data);
    setIsSubmitting(true);
    createWarehouseMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-[60vw] !w-[60vw]">
        <DialogHeader>
          <DialogTitle>Create New Warehouse</DialogTitle>
          <DialogDescription>
            Add a new warehouse to manage your inventory storage locations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Show form errors if any */}
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-medium text-red-800">Please fix the following errors:</p>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {Object.entries(form.formState.errors).map(([key, error]) => (
                    <li key={key}>{error?.message?.toString()}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="MW01" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>
                      Short unique identifier (max 10 chars)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="shippingLocationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shipping location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingLocations ? (
                        <SelectItem value="loading" disabled>
                          Loading locations...
                        </SelectItem>
                      ) : (
                        shippingLocations?.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div className="max-w-[370px]">
                              <div className="text-sm text-muted-foreground">{location.address}</div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Warehouse will use this location's address and coordinates
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Create Warehouse
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 