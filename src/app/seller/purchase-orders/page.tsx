"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc-provider"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Truck,
  Package,
  FileText,
  Loader2,
  ClipboardList,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount).replace('$', '₹')
}

// Format date
const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

// Status badge component
const POStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    PENDING: { variant: "outline", className: "border-yellow-400 text-yellow-600 bg-yellow-50" },
    ACKNOWLEDGED: { variant: "default", className: "bg-blue-500" },
    IN_PROGRESS: { variant: "default", className: "bg-purple-500" },
    SHIPPED: { variant: "default", className: "bg-orange-500" },
    DELIVERED: { variant: "default", className: "bg-green-500" },
    CANCELLED: { variant: "outline", className: "border-red-400 text-red-600" },
  }

  const cfg = config[status] || { variant: "outline" as const, className: "" }

  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"createdAt" | "total" | "poNumber" | "deliveryDate">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const limit = 10

  // Fetch POs
  const { data, isLoading, error } = useQuery({
    ...trpc.procurement.po.list.queryOptions({
      page,
      limit,
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter as any,
      sortBy,
      sortOrder,
    }),
  })

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    ...trpc.procurement.po.acknowledge.mutationOptions(),
    onSuccess: () => {
      toast.success("PO acknowledged successfully")
      queryClient.invalidateQueries({ queryKey: [["procurement", "po", "list"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to acknowledge PO")
    },
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    ...trpc.procurement.po.updateStatus.mutationOptions(),
    onSuccess: () => {
      toast.success("PO status updated")
      queryClient.invalidateQueries({ queryKey: [["procurement", "po", "list"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status")
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-red-600">Purchase Orders</h1>
          <p className="text-muted-foreground">
            View and manage purchase orders received from the client
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by PO number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="total">Total Amount</SelectItem>
                    <SelectItem value="poNumber">PO Number</SelectItem>
                    <SelectItem value="deliveryDate">Delivery Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PO List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Purchase Orders
            </CardTitle>
            <CardDescription>
              {data?.total || 0} total purchase orders
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading purchase orders
              </div>
            ) : !data?.purchaseOrders?.length ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No Purchase Orders</h3>
                <p className="text-gray-400">
                  {statusFilter !== "all" 
                    ? "No POs found with the selected filter" 
                    : "You haven't received any purchase orders yet"}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>PI Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">
                          <Link 
                            href={`/seller/purchase-orders/${po.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {po.poNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {po.proformaInvoice ? (
                            <Link 
                              href={`/seller/proforma-invoices/${po.proformaInvoice.id}`}
                              className="text-gray-600 hover:underline"
                            >
                              {po.proformaInvoice.piNumber}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <POStatusBadge status={po.status} />
                        </TableCell>
                        <TableCell>{po.items.length} items</TableCell>
                        <TableCell>
                          {po.deliveryDate ? formatDate(po.deliveryDate) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(po.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link href={`/seller/purchase-orders/${po.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {po.status === "PENDING" && (
                                <DropdownMenuItem
                                  onClick={() => acknowledgeMutation.mutate({ id: po.id })}
                                  disabled={acknowledgeMutation.isPending}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Acknowledge
                                </DropdownMenuItem>
                              )}
                              {po.status === "ACKNOWLEDGED" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ id: po.id, status: "IN_PROGRESS" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Package className="mr-2 h-4 w-4" />
                                  Start Processing
                                </DropdownMenuItem>
                              )}
                              {po.status === "IN_PROGRESS" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ id: po.id, status: "SHIPPED" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Truck className="mr-2 h-4 w-4" />
                                  Mark as Shipped
                                </DropdownMenuItem>
                              )}
                              {po.status === "SHIPPED" && (
                                <DropdownMenuItem
                                  onClick={() => updateStatusMutation.mutate({ id: po.id, status: "DELIVERED" })}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark as Delivered
                                </DropdownMenuItem>
                              )}
                              {po.status === "DELIVERED" && !po.invoiceId && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/seller/invoices/new?poId=${po.id}`}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Generate Invoice
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <p className="text-sm text-gray-500">
                      Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.total)} of {data.total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === data.totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
