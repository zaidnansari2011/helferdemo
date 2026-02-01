"use client";

import { useState, useRef, useEffect } from "react";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Package, Warehouse } from "lucide-react";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarcodeComponent } from "../ui/Barcode";

interface LocationAssignmentModalProps {
  productId?: string | null;
  productVariantId?: string | null;
  itemName?: string; // Product name or variant name
  itemType?: 'product' | 'variant';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LocationAssignmentModal({
  productId,
  productVariantId,
  itemName,
  itemType = 'variant',
  open,
  onOpenChange,
  onSuccess,
}: LocationAssignmentModalProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedBinId, setSelectedBinId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery({
    ...trpc.inventoryProducts.getWarehouses.queryOptions(),
    enabled: open,
  });

  const { data: bins = [], isLoading: binsLoading } = useQuery({
    ...trpc.inventoryProducts.locations.getAvailableBins.queryOptions({ warehouseId: selectedWarehouseId }),
    enabled: !!selectedWarehouseId,
  });

  const assignLocationMutation = useMutation(trpc.inventoryProducts.locations.assign.mutationOptions({
    onSuccess: () => {
      toast.success("Location assigned successfully!");
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign location");
    },
  }));

  const resetForm = () => {
    setSelectedWarehouseId("");
    setSelectedBinId("");
    setQuantity(1);
  };

  // Reset form when modal opens/closes
  const prevOpen = React.useRef(open);
  React.useEffect(() => {
    if (!open && prevOpen.current) {
      resetForm();
    }
    prevOpen.current = open;
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!productId && !productVariantId) || !selectedBinId || quantity <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const mutationData: any = {
      binId: selectedBinId,
      quantity,
    };

    if (productVariantId) {
      mutationData.productVariantId = productVariantId;
    } else if (productId) {
      mutationData.productId = productId;
    }

    assignLocationMutation.mutate(mutationData);
  };

  const selectedBin = bins.find(bin => bin.id === selectedBinId);
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg mx-4 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 flex-shrink-0" />
            Assign Warehouse Location
          </DialogTitle>
          <DialogDescription className="text-sm">
            Assign {itemName || `this ${itemType}`} to a specific warehouse location
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">Warehouse</Label>
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id} className="p-3">
                    <div className="flex items-start gap-3 w-full min-w-0">
                      <Warehouse className="h-4 w-4 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-muted-foreground truncate">
                          {warehouse.code} • {warehouse.address}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bin Selection */}
          {selectedWarehouseId && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              {binsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Select value={selectedBinId} onValueChange={setSelectedBinId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 w-full">
                    {bins.map((bin) => (
                      <SelectItem key={bin.id} value={bin.id} className="p-3">
                        <div className="flex flex-col gap-1 w-full min-w-0">
                          <div className="text-xs text-muted-foreground truncate">
                            {bin.fullPath}  {bin._count.productLocations} product{bin._count.productLocations !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {bins.length === 0 && !binsLoading && selectedWarehouseId && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Package className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      No storage locations found in this warehouse.
                      <br />
                      Please set up warehouse hierarchy first.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Quantity Input */}
          {selectedBinId && (
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                placeholder="Enter quantity"
                className="w-full"
              />
            </div>
          )}

          {/* Preview */}
          {selectedBin && selectedWarehouse && (
            <Card>
              <CardHeader className="pb-3 flex items-center justify-between py-0">
                <CardTitle className="text-base">Assignment Preview</CardTitle>
                <BarcodeComponent 
                  value={selectedBin.locationCode}
                  width={1}
                  height={30}
                  fontSize={10}
                  label="Location Code"
                  showPrintButton={true}
                  className="scale-75 origin-right"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Warehouse:</span>
                    <span className="font-medium text-right truncate">{selectedWarehouse.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Location:</span>
                    <span className="font-mono text-sm text-right truncate">{selectedBin.locationCode}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Full Path:</span>
                    <span className="text-sm text-right break-words">{selectedBin.fullPath}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground flex-shrink-0">Quantity:</span>
                    <Badge variant="outline" className="flex-shrink-0">{quantity} units</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedBinId || quantity <= 0 || assignLocationMutation.isPending}
              className="w-full sm:w-auto"
            >
              {assignLocationMutation.isPending ? "Assigning..." : "Assign Location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 