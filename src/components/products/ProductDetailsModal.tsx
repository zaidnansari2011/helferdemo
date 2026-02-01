"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Edit, 
  Trash2, 
  Plus, 
  Tag, 
  BarChart3, 
  MapPin,
  Copy,
  Eye
} from "lucide-react";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { VariantCreateModal } from "./VariantCreateModal";

interface ProductDetailsModalProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProductDetailsModal({ 
  productId, 
  open, 
  onOpenChange, 
  onSuccess 
}: ProductDetailsModalProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createVariantModalOpen, setCreateVariantModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const { data: product, isLoading, refetch } = useQuery({
    ...trpc.inventoryProducts.getById.queryOptions({ id: productId! }),
    enabled: !!productId,
  });

  const deleteProductMutation = useMutation(trpc.inventoryProducts.delete.mutationOptions({
    onSuccess: () => {
      toast.success("Product deleted successfully!");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete product");
    },
  }));

  const deleteVariantMutation = useMutation(trpc.inventoryProducts.variants.delete.mutationOptions({
    onSuccess: () => {
      toast.success("Variant deleted successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete variant");
    },
  }));

  const removeLocationMutation = useMutation(trpc.inventoryProducts.locations.remove.mutationOptions({
    onSuccess: () => {
      toast.success("Location removed successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove location");
    },
  }));

  const updateLocationMutation = useMutation(trpc.inventoryProducts.locations.update.mutationOptions({
    onSuccess: () => {
      toast.success("Location updated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update location");
    },
  }));

  const handleDeleteProduct = () => {
    if (productId && confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      deleteProductMutation.mutate({ id: productId });
    }
  };

  const handleDeleteVariant = (variantId: string) => {
    if (confirm("Are you sure you want to delete this variant? This action cannot be undone.")) {
      deleteVariantMutation.mutate({ id: variantId });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleAssignLocation = (variantId: string, variantName: string) => {
    setSelectedVariantForLocation({ id: variantId, name: variantName });
    setAssigningToProduct(false);
    setLocationAssignmentModalOpen(true);
  };

  const handleAssignProductLocation = () => {
    setSelectedVariantForLocation(null);
    setAssigningToProduct(true);
    setLocationAssignmentModalOpen(true);
  };

  const handleRemoveLocation = (locationId: string) => {
    if (confirm("Are you sure you want to remove this location assignment?")) {
      removeLocationMutation.mutate({ id: locationId });
    }
  };

  const handleUpdateQuantity = (locationId: string, currentQuantity: number) => {
    const newQuantity = prompt(`Enter new quantity (current: ${currentQuantity}):`);
    if (newQuantity && !isNaN(parseInt(newQuantity)) && parseInt(newQuantity) > 0) {
      updateLocationMutation.mutate({ 
        id: locationId, 
        quantity: parseInt(newQuantity) 
      });
    }
  };

  if (!productId) return null;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[80vw] !w-[80vw] !max-h-[90vh]">
          <DialogTitle className="sr-only">Loading product details</DialogTitle>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!product) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[80vw] !w-[80vw]">
          <DialogTitle className="sr-only">Product not found</DialogTitle>
          <div className="text-center py-20">
            <p className="text-muted-foreground">Product not found</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const images = JSON.parse(product.images || '[]') as string[];
  const hasImages = images.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[80vw] !w-[80vw] !max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {product.name}
              </DialogTitle>
              <DialogDescription>
                Manage product details and variants
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteProduct}
                disabled={deleteProductMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">
              Variants ({product.variants?.length || 0})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="overview" className="space-y-8">
              {/* Main Content Layout */}
              <div className="flex gap-8">
                {/* Product Image */}
                <div className="w-64 flex-shrink-0">
                  {hasImages ? (
                    <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden border">
                      <img 
                        src={images[0]} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-50 rounded-lg flex items-center justify-center border">
                      <Package className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1">
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900 mb-1">{product.name}</h1>
                      <p className="text-gray-600">{product.category.name}</p>
                    </div>

                    {/* Key Details Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">SKU</dt>
                        <dd className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-sm">{product.sku}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(product.sku)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </dd>
                      </div>

                      <div>
                        <dt className="text-sm font-medium text-gray-500">Base Price</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">₹{product.basePrice.toFixed(2)}</dd>
                      </div>

                      {product.brand && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Brand</dt>
                          <dd className="mt-1 text-sm text-gray-900">{product.brand}</dd>
                        </div>
                      )}

                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1">
                          <Badge variant={product.isActive ? "default" : "secondary"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </dd>
                      </div>

                      <div>
                        <dt className="text-sm font-medium text-gray-500">Variants</dt>
                        <dd className="mt-1 text-sm text-gray-900">{product.variants?.length || 0}</dd>
                      </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 mb-2">Description</dt>
                        <dd className="text-sm text-gray-700 leading-relaxed">
                          {product.description}
                        </dd>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="variants" className="space-y-6">
              {/* Header Section */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Product Variants</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage different configurations of your product
                  </p>
                </div>
                <Button 
                  onClick={() => setCreateVariantModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>

              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-4">
                  {product.variants.map((variant, index) => {
                    const attributes = JSON.parse(variant.attributes || '{}');
                    const hasLocations = variant.productLocations && variant.productLocations.length > 0;
                    
                    return (
                      <Card key={variant.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                          {/* Variant Header */}
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">{variant.name}</h4>
                                <Badge 
                                  variant={variant.isActive ? "default" : "secondary"}
                                  className={variant.isActive ? "bg-green-100 text-green-800 border-green-200" : ""}
                                >
                                  {variant.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Tag className="h-4 w-4" />
                                <span className="font-mono">{variant.sku}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(variant.sku)}
                                  className="h-6 w-6 p-0 hover:bg-gray-100"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              {/* <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAssignLocation(variant.id, variant.name)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                Assign Location
                              </Button> */}
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                Location: Managed by Admin
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVariant(variant.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>

                          {/* Variant Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">
                            {/* Price */}
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium text-green-800">Price</span>
                              </div>
                              <p className="text-2xl font-bold text-green-700">
                                ₹{variant.price.toFixed(2)}
                              </p>
                            </div>

                            {/* Barcode */}
                            {variant.barcode && (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-gray-600">Barcode</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-sm text-gray-900">{variant.barcode}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(variant.barcode!)}
                                    className="h-6 w-6 p-0 hover:bg-gray-200"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}



                            {/* Total Stock (if we have location data) */}
                            {variant.productLocations && variant.productLocations.length > 0 && (
                              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-orange-800">Total Stock</span>
                                </div>
                                <p className="text-lg font-semibold text-orange-700">
                                  {variant.productLocations.reduce((sum, loc) => sum + loc.quantity, 0)} units
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Attributes */}
                          {Object.keys(attributes).length > 0 && (
                            <div className="border-t pt-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Variant Attributes
                              </h5>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(attributes).map(([key, value]) => (
                                  <Badge 
                                    key={key} 
                                    variant="secondary"
                                    className="bg-purple-100 text-purple-800 border-purple-200 px-3 py-1"
                                  >
                                    <span className="font-medium">{key}:</span>
                                    <span className="ml-1">{String(value)}</span>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                /* Empty State */
                <Card className="border-2 border-dashed border-gray-200">
                  <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <BarChart3 className="h-10 w-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Variants Yet</h3>
                    <p className="text-gray-500 text-center mb-6 max-w-md">
                      Create variants to manage different sizes, colors, specifications, or any other product variations.
                    </p>
                    <Button 
                      onClick={() => setCreateVariantModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Variant
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Modals */}
        {/* <EditProductModal 
          productId={productId}
          open={editModalOpen} 
          onOpenChange={setEditModalOpen}
          onSuccess={() => {
            refetch();
            setEditModalOpen(false);
          }}
        /> */}
        <VariantCreateModal 
          productId={productId}
          open={createVariantModalOpen}
          onOpenChange={setCreateVariantModalOpen}
          onSuccess={() => {
            refetch();
            setCreateVariantModalOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
} 