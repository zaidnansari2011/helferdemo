"use client";

import { CreateProductModal } from "@/components/products/CreateProductModal";
import { ProductDetailsModal } from "@/components/products/ProductDetailsModal";
import { trpc } from "@/lib/trpc-provider";
import { useQuery } from "@tanstack/react-query";

import { useState, useMemo, Suspense } from "react";
import { Plus, Package, Tag, Eye, Search, Filter, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductListItem {
  id: string;
  productCode: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  sku: string;
  basePrice: number;
  images: string;
  isActive?: boolean;
  status: string;
  category: {
    id: string;
    name: string;
  };
  _count: {
    variants: number;
  };
}

function ProductsContent() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all-categories");
  const [selectedBrand, setSelectedBrand] = useState<string>("all-brands");
  const [selectedStatus, setSelectedStatus] = useState<string>("all-status");
  
  // Fetch real products from database
  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts } = useQuery(
    trpc.inventoryProducts.list.queryOptions()
  );
  const products = productsData || [];

  // Fetch real categories
  const { data: categoriesData, isLoading: loadingCategories } = useQuery(
    trpc.products.getCategories.queryOptions()
  );
  const categories = categoriesData || [];

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
          (product.description && product.description.toLowerCase().includes(query)) ||
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
        if (selectedStatus === "active" && product.status !== "ACTIVE") return false;
        if (selectedStatus === "inactive" && product.status === "ACTIVE") return false;
      }
      
      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedStatus]);

  const handleProductCreated = () => {
    setCreateModalOpen(false);
    refetchProducts(); // Refresh product list after creation
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

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-red-600">Product Management</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and variants
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-all duration-200" />
              <Input
                placeholder="Search products by name, SKU, description, or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
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
                  className="gap-2 animate-in fade-in-0 slide-in-from-left-2 transition-all duration-200 hover:scale-105 active:scale-95"
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

      {/* Loading State */}
      {loadingProducts ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product: ProductListItem, index: number) => {
            const images = JSON.parse(product.images || '[]') as string[];
            const hasImage = images.length > 0;
            
            return (
              <Card 
                key={product.id} 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
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
                    <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Product Image */}
                  {hasImage ? (
                    <div className="w-full aspect-video bg-gray-100 rounded-md overflow-hidden group-hover:shadow-inner transition-all duration-300">
                      <img 
                        src={images[0]} 
                        alt={product.name}
                        className="w-full h-full object-contain transition-transform duration-300 hover:scale-110"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center transition-all duration-300 hover:bg-gray-200">
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
                    className="w-full mt-3 transition-all duration-200 hover:scale-105 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 active:scale-95"
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

      {/* Create Product Modal */}
      <CreateProductModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleProductCreated}
        warehouseId="demo-warehouse"
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        productId={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        onSuccess={() => {
          // In demo mode, this would refetch products
        }}
      /> </div>
  );
}

// Wrap in Suspense for static generation
export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
} 



