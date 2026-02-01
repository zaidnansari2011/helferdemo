"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc-provider"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Save,
  Loader2,
  Calculator,
  Package,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type PIItem = {
  id?: string
  productId: string
  variantId?: string
  description: string
  quantity: number
  unitPrice: number
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount).replace('$', '₹')
}

export default function EditPIPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Form state
  const [validUntil, setValidUntil] = useState("")
  const [creditTerms, setCreditTerms] = useState<"IMMEDIATE" | "NET_30" | "NET_60" | "NET_90">("NET_30")
  const [deliveryTerms, setDeliveryTerms] = useState("")
  const [notes, setNotes] = useState("")
  const [taxRate, setTaxRate] = useState(18)
  const [discount, setDiscount] = useState(0)
  const [items, setItems] = useState<PIItem[]>([])
  
  // Product selection state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedVariantId, setSelectedVariantId] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemUnitPrice, setItemUnitPrice] = useState(0)

  // Fetch PI details
  const { data: pi, isLoading: piLoading, error: piError } = useQuery({
    ...trpc.procurement.pi.getById.queryOptions({ id }),
  })

  // Populate form when PI data loads
  useEffect(() => {
    if (pi) {
      setValidUntil(new Date(pi.validUntil).toISOString().split("T")[0])
      setCreditTerms(pi.creditTerms as typeof creditTerms)
      setDeliveryTerms(pi.deliveryTerms || "")
      setNotes(pi.notes || "")
      setTaxRate(pi.taxRate)
      setDiscount(pi.discount)
      setItems(
        pi.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      )
    }
  }, [pi])

  // Fetch seller's products
  const { data: products, isLoading: productsLoading } = useQuery({
    ...trpc.products.getSellerProducts.queryOptions({
      page: 1,
      limit: 100,
      sortBy: "name",
      sortOrder: "asc",
    }),
  })

  // Get selected product details
  const selectedProduct = products?.products.find((p) => p.id === selectedProductId)

  // Update PI mutation
  const updateMutation = useMutation({
    ...trpc.procurement.pi.update.mutationOptions(),
    onSuccess: () => {
      toast.success("Proforma Invoice updated successfully")
      queryClient.invalidateQueries({ queryKey: [["procurement", "pi", "getById"]] })
      router.push(`/seller/proforma-invoices/${id}`)
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update PI")
    },
  })

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxAmount = (subtotal - discount) * (taxRate / 100)
  const total = subtotal - discount + taxAmount

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId)
    setSelectedVariantId("")
    const product = products?.products.find((p) => p.id === productId)
    if (product) {
      setItemDescription(product.name)
      setItemUnitPrice(product.basePrice)
    }
  }

  // Handle variant selection
  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId)
    const variant = selectedProduct?.variants.find((v) => v.id === variantId)
    if (variant) {
      setItemDescription(`${selectedProduct?.name} - ${variant.name}`)
      setItemUnitPrice(variant.price)
    }
  }

  // Add item to PI
  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error("Please select a product")
      return
    }
    if (!itemDescription) {
      toast.error("Please enter a description")
      return
    }
    if (itemQuantity <= 0) {
      toast.error("Quantity must be greater than 0")
      return
    }
    if (itemUnitPrice <= 0) {
      toast.error("Unit price must be greater than 0")
      return
    }

    const newItem: PIItem = {
      productId: selectedProductId,
      variantId: selectedVariantId || undefined,
      description: itemDescription,
      quantity: itemQuantity,
      unitPrice: itemUnitPrice,
    }

    setItems([...items, newItem])
    
    // Reset form
    setSelectedProductId("")
    setSelectedVariantId("")
    setItemDescription("")
    setItemQuantity(1)
    setItemUnitPrice(0)
  }

  // Remove item from PI
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Submit form
  const handleSubmit = () => {
    if (items.length === 0) {
      toast.error("Please add at least one item")
      return
    }
    if (!validUntil) {
      toast.error("Please set a valid until date")
      return
    }

    updateMutation.mutate({
      id,
      validUntil,
      creditTerms,
      deliveryTerms: deliveryTerms || undefined,
      notes: notes || undefined,
      taxRate,
      discount,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })
  }

  if (piLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (piError || !pi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">PI Not Found</h2>
            <p className="text-gray-500 mb-4">The requested proforma invoice could not be found.</p>
            <Link href="/seller/proforma-invoices">
              <Button>Back to PIs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (pi.status !== "DRAFT") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Cannot Edit PI</h2>
            <p className="text-gray-500 mb-4">
              Only draft PIs can be edited. This PI has status: {pi.status}
            </p>
            <Link href={`/seller/proforma-invoices/${id}`}>
              <Button>View PI</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/seller/proforma-invoices/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-red-600">Edit {pi.piNumber}</h1>
            <p className="text-muted-foreground">
              Modify this proforma invoice
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* PI Details */}
            <Card>
              <CardHeader>
                <CardTitle>PI Details</CardTitle>
                <CardDescription>Basic information about this proforma invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid Until *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditTerms">Credit Terms</Label>
                    <Select value={creditTerms} onValueChange={(v) => setCreditTerms(v as typeof creditTerms)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IMMEDIATE">Immediate Payment</SelectItem>
                        <SelectItem value="NET_30">Net 30 Days</SelectItem>
                        <SelectItem value="NET_60">Net 60 Days</SelectItem>
                        <SelectItem value="NET_90">Net 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                  <Input
                    id="deliveryTerms"
                    placeholder="e.g., Ex-Works, FOB, CIF..."
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or terms..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Add Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Add Items
                </CardTitle>
                <CardDescription>Select products to add to this PI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select value={selectedProductId} onValueChange={handleProductSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsLoading ? (
                          <SelectItem value="__loading__" disabled>Loading...</SelectItem>
                        ) : products?.products.length === 0 ? (
                          <SelectItem value="__no_products__" disabled>No products available</SelectItem>
                        ) : (
                          products?.products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {formatCurrency(product.basePrice)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProduct && selectedProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <Label>Variant</Label>
                      <Select value={selectedVariantId} onValueChange={handleVariantSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select variant (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProduct.variants.map((variant) => (
                            <SelectItem key={variant.id} value={variant.id}>
                              {variant.name} - {formatCurrency(variant.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    placeholder="Item description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price (₹) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemUnitPrice}
                      onChange={(e) => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <Input
                      value={formatCurrency(itemQuantity * itemUnitPrice)}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <Button onClick={handleAddItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardContent>
            </Card>

            {/* Items List */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.quantity * item.unitPrice)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Pricing Summary */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Discount (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-red-500">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({taxRate}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={updateMutation.isPending || items.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Link href={`/seller/proforma-invoices/${id}`} className="block">
                    <Button variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
