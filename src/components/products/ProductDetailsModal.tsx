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
import { toast } from "sonner";

// DEMO MODE: Mock product with variants
const getMockProduct = (productId: string) => {
  const mockProducts = {
    "1": {
      id: "1",
      productCode: "PRD-001",
      name: "Industrial Power Drill",
      description: "Heavy-duty power drill for industrial applications with variable speed control. Features include: Variable speed trigger, Forward/reverse switch, 360° side handle, Depth gauge, Heavy-duty keyed chuck",
      brand: "DeWalt",
      sku: "DRL-IND-001",
      basePrice: 4500,
      images: JSON.stringify(["https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400"]),
      isActive: true,
      category: { id: "cat1", name: "Tools" },
      variants: [
        {
          id: "v1-1",
          name: "13mm Standard",
          sku: "DRL-IND-001-13MM",
          price: 4500,
          barcode: "8901234567890",
          isActive: true,
          attributes: JSON.stringify({ "Chuck Size": "13mm", "Power": "550W" }),
          productLocations: [{ quantity: 25, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v1-2",
          name: "10mm Compact",
          sku: "DRL-IND-001-10MM",
          price: 3800,
          barcode: "8901234567891",
          isActive: true,
          attributes: JSON.stringify({ "Chuck Size": "10mm", "Power": "450W" }),
          productLocations: [{ quantity: 30, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v1-3",
          name: "16mm Heavy Duty",
          sku: "DRL-IND-001-16MM",
          price: 5200,
          barcode: "8901234567892",
          isActive: true,
          attributes: JSON.stringify({ "Chuck Size": "16mm", "Power": "650W" }),
          productLocations: [{ quantity: 15, warehouse: { name: "Main Warehouse" } }]
        }
      ]
    },
    "2": {
      id: "2",
      productCode: "PRD-002",
      name: "Safety Helmet",
      description: "Industrial safety helmet with adjustable straps and ventilation. Meets all safety standards including IS 2925:1984 certification. Features UV protection and impact resistance.",
      brand: "3M",
      sku: "SFT-HLM-001",
      basePrice: 850,
      images: JSON.stringify(["/safetyhelmet.jpg"]),
      isActive: true,
      category: { id: "cat2", name: "Safety Equipment" },
      variants: [
        {
          id: "v2-1",
          name: "Standard White",
          sku: "SFT-HLM-001-WHT",
          price: 850,
          barcode: "8901234567893",
          isActive: true,
          attributes: JSON.stringify({ "Color": "White", "Size": "Universal" }),
          productLocations: [{ quantity: 50, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v2-2",
          name: "Standard Yellow",
          sku: "SFT-HLM-001-YLW",
          price: 850,
          barcode: "8901234567894",
          isActive: true,
          attributes: JSON.stringify({ "Color": "Yellow", "Size": "Universal" }),
          productLocations: [{ quantity: 45, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v2-3",
          name: "Standard Red",
          sku: "SFT-HLM-001-RED",
          price: 850,
          barcode: "8901234567895",
          isActive: true,
          attributes: JSON.stringify({ "Color": "Red", "Size": "Universal" }),
          productLocations: [{ quantity: 40, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v2-4",
          name: "Standard Blue",
          sku: "SFT-HLM-001-BLU",
          price: 850,
          barcode: "8901234567896",
          isActive: true,
          attributes: JSON.stringify({ "Color": "Blue", "Size": "Universal" }),
          productLocations: [{ quantity: 35, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v2-5",
          name: "Standard Orange",
          sku: "SFT-HLM-001-ORG",
          price: 850,
          barcode: "8901234567897",
          isActive: true,
          attributes: JSON.stringify({ "Color": "Orange", "Size": "Universal" }),
          productLocations: [{ quantity: 38, warehouse: { name: "Main Warehouse" } }]
        }
      ]
    },
    "3": {
      id: "3",
      productCode: "PRD-003",
      name: "PVC Pipe 4 inch",
      description: "High-quality PVC pipe for plumbing applications. Corrosion resistant, lightweight, and easy to install. Suitable for water supply and drainage systems.",
      brand: "Supreme",
      sku: "PLB-PVC-004",
      basePrice: 320,
      images: JSON.stringify(["/pvcpipe.jpg"]),
      isActive: true,
      category: { id: "cat3", name: "Plumbing" },
      variants: [
        {
          id: "v3-1",
          name: "3 meter length",
          sku: "PLB-PVC-004-3M",
          price: 320,
          barcode: "8901234567898",
          isActive: true,
          attributes: JSON.stringify({ "Length": "3m", "Diameter": "4 inch" }),
          productLocations: [{ quantity: 100, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v3-2",
          name: "6 meter length",
          sku: "PLB-PVC-004-6M",
          price: 600,
          barcode: "8901234567899",
          isActive: true,
          attributes: JSON.stringify({ "Length": "6m", "Diameter": "4 inch" }),
          productLocations: [{ quantity: 75, warehouse: { name: "Main Warehouse" } }]
        }
      ]
    },
    "4": {
      id: "4",
      productCode: "PRD-004",
      name: "LED Bulb 12W",
      description: "Energy efficient LED bulb with 5 year warranty. Cool white light, instant on, no warm-up time. Save up to 85% on electricity bills.",
      brand: "Philips",
      sku: "ELC-LED-012",
      basePrice: 180,
      images: JSON.stringify(["/ledbulb.jpg"]),
      isActive: false,
      category: { id: "cat4", name: "Electrical" },
      variants: [
        {
          id: "v4-1",
          name: "Cool White B22",
          sku: "ELC-LED-012-CW-B22",
          price: 180,
          barcode: "8901234567900",
          isActive: true,
          attributes: JSON.stringify({ "Color Temperature": "Cool White", "Base": "B22" }),
          productLocations: [{ quantity: 200, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v4-2",
          name: "Warm White B22",
          sku: "ELC-LED-012-WW-B22",
          price: 180,
          barcode: "8901234567901",
          isActive: true,
          attributes: JSON.stringify({ "Color Temperature": "Warm White", "Base": "B22" }),
          productLocations: [{ quantity: 180, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v4-3",
          name: "Cool White E27",
          sku: "ELC-LED-012-CW-E27",
          price: 190,
          barcode: "8901234567902",
          isActive: true,
          attributes: JSON.stringify({ "Color Temperature": "Cool White", "Base": "E27" }),
          productLocations: [{ quantity: 150, warehouse: { name: "Main Warehouse" } }]
        },
        {
          id: "v4-4",
          name: "Warm White E27",
          sku: "ELC-LED-012-WW-E27",
          price: 190,
          barcode: "8901234567903",
          isActive: true,
          attributes: JSON.stringify({ "Color Temperature": "Warm White", "Base": "E27" }),
          productLocations: [{ quantity: 160, warehouse: { name: "Main Warehouse" } }]
        }
      ]
    }
  };
  
  return mockProducts[productId as keyof typeof mockProducts] || null;
};

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
  const [createVariantModalOpen, setCreateVariantModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // DEMO MODE: Use mock data instead of API
  const product = productId ? getMockProduct(productId) : null;
  const isLoading = false;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleDeleteProduct = () => {
    if (productId && confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      toast.success("Product deleted successfully! (Demo mode - no actual deletion)");
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleDeleteVariant = (variantId: string) => {
    if (confirm("Are you sure you want to delete this variant? This action cannot be undone.")) {
      toast.success("Variant deleted successfully! (Demo mode - no actual deletion)");
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
      <DialogContent className="!max-w-[80vw] !w-[80vw] !max-h-[90vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
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
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="transition-all duration-200">Overview</TabsTrigger>
            <TabsTrigger value="variants" className="transition-all duration-200">
              Variants ({product.variants?.length || 0})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            <TabsContent value="overview" className="space-y-8 transition-all duration-300">
              {/* Main Content Layout */}
              <div className="flex gap-8">
                {/* Product Image */}
                <div className="w-64 flex-shrink-0">
                  {hasImages ? (
                    <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden border">
                      <img 
                        src={images[0]} 
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>';
                          }
                        }}
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
                        <dt className="text-sm font-medium text-gray-500">Product Code</dt>
                        <dd className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-sm">{product.productCode}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(product.productCode)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </dd>
                      </div>

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

            <TabsContent value="variants" className="space-y-6 transition-all duration-300">
              {/* Header Section */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Product Variants</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage different configurations of your product
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    toast.info("Add variant feature coming soon! (Demo mode)");
                  }}
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
                      onClick={() => {
                        toast.info("Add variant feature coming soon! (Demo mode)");
                      }}
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
      </DialogContent>
    </Dialog>
  );
} 