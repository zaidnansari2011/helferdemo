"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Package, Tag, Eye, Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc-provider";
import { useQuery } from "@tanstack/react-query";
import { CreateProductModal } from "@/components/products/CreateProductModal";
import { ProductDetailsModal } from "@/components/products/ProductDetailsModal";

interface ProductListItem {
  id: string;
  productCode: string;
  name: string;
  description: string;
  brand?: string | null;
  sku: string;
  basePrice: number;
  images: string;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  };
  _count: {
    variants: number;
  };
}

export default function ProductsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all-categories");
  const [selectedBrand, setSelectedBrand] = useState<string>("all-brands");
  const [selectedStatus, setSelectedStatus] = useState<string>("all-status");
  
  const searchParams = useSearchParams();
  
  // Get warehouseId from URL query params
  const warehouseId = searchParams.get('warehouseId') || undefined;

  const { data: products, isLoading, refetch } = useQuery(trpc.inventoryProducts.list.queryOptions());
  const { data: categories } = useQuery(trpc.products.getCategories.queryOptions());

  // Extract unique brands from products
  const uniqueBrands = useMemo(() => {
    if (!products) return [];
    const brands = products
      .map(product => product.brand)
      .filter((brand): brand is string => !!brand)
      .filter((brand, index, array) => array.indexOf(brand) === index)
      .sort();
    return brands;
  }, [products]);

  // Filter products based on search and filter criteria
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.productCode.toLowerCase().includes(query) ||
          (product.brand && product.brand.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (selectedCategory && selectedCategory !== "all-categories" && product.category.id !== selectedCategory) {
        return false;
      }
      
      // Brand filter
      if (selectedBrand && selectedBrand !== "all-brands" && product.brand !== selectedBrand) {
        return false;
      }
      
      // Status filter
      if (selectedStatus && selectedStatus !== "all-status") {
        const isActive = selectedStatus === "active";
        if (product.isActive !== isActive) {
          return false;
        }
      }
      
      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedStatus]);

  const handleProductCreated = () => {
    refetch();
    setCreateModalOpen(false);
  };

  const handleProductClick = (productId: string) => {
    setSelectedProduct(productId);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all-categories");
    setSelectedBrand("all-brands");
    setSelectedStatus("all-status");
  };

  const hasActiveFilters = searchQuery || 
    (selectedCategory && selectedCategory !== "all-categories") || 
    (selectedBrand && selectedBrand !== "all-brands") || 
    (selectedStatus && selectedStatus !== "all-status");

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-muted-foreground">Manage your product catalog and variants</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex gap-2 mt-4">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-red-600">Product Management</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and variants
            {warehouseId && (
              <span className="block text-sm text-brand-navy mt-1">
                Adding products for selected warehouse
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products by name, SKU, description, or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filters:</span>
              </div>
              
              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Brand Filter */}
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-brands">All Brands</SelectItem>
                  {uniqueBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
            
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredProducts.length} of {products?.length || 0} products
                {hasActiveFilters && (
                  <span className="text-brand-navy ml-1">(filtered)</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts && filteredProducts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product: ProductListItem) => {
            const images = JSON.parse(product.images || '[]') as string[];
            const hasImage = images.length > 0;
            
            return (
              <Card 
                key={product.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleProductClick(product.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-brand-navy" />
                      <div>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription>Code: {product.productCode} | SKU: {product.sku}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Product Image */}
                  {hasImage ? (
                    <div className="w-full aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img 
                        src={images[0]} 
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Category:</span>
                      <Badge variant="outline">
                        <Tag className="w-3 h-3 mr-1" />
                        {product.category.name}
                      </Badge>
                    </div>
                    
                    {product.brand && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Brand:</span>
                        <span className="text-sm font-medium">{product.brand}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Base Price:</span>
                      <span className="text-sm font-medium">₹{product.basePrice.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Variants:</span>
                      <Badge variant="outline">
                        {product._count.variants} variant{product._count.variants !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>

                  {/* Action Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductClick(product.id);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            {hasActiveFilters ? (
              <>
                <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground text-center mb-6">
                  No products match your current filters. Try adjusting your search criteria.
                </p>
                <Button onClick={clearAllFilters} variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  Clear All Filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-2">No Products Yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Start building your product catalog by adding your first product.
                </p>
                <Button onClick={() => setCreateModalOpen(true)} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Product
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateProductModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        onSuccess={handleProductCreated}
        warehouseId={warehouseId}
      />
      <ProductDetailsModal 
        productId={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        onSuccess={refetch}
      />
    </div>
  );
} 