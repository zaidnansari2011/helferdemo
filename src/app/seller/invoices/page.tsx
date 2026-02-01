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
  Send,
  AlertCircle,
  Loader2,
  Receipt,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  DollarSign,
  Clock,
  CheckCircle2
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
const InvoiceStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; className: string }> = {
    DRAFT: { variant: "outline", icon: null, className: "border-gray-400 text-gray-600" },
    SENT: { variant: "default", icon: <Send className="h-3 w-3" />, className: "bg-blue-500" },
    VIEWED: { variant: "default", icon: <Eye className="h-3 w-3" />, className: "bg-purple-500" },
    PARTIALLY_PAID: { variant: "default", icon: <DollarSign className="h-3 w-3" />, className: "bg-orange-500" },
    PAID: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-green-500" },
    OVERDUE: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" />, className: "" },
    CANCELLED: { variant: "outline", icon: null, className: "border-red-400 text-red-600" },
  }

  const cfg = config[status] || { variant: "outline" as const, icon: null, className: "" }

  return (
    <Badge variant={cfg.variant} className={`gap-1 ${cfg.className}`}>
      {cfg.icon}
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"createdAt" | "total" | "invoiceNumber" | "dueDate">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const limit = 10

  // Fetch invoices
  const { data, isLoading, error } = useQuery({
    ...trpc.procurement.invoice.list.queryOptions({
      page,
      limit,
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter as any,
      sortBy,
      sortOrder,
    }),
  })

  // Send mutation
  const sendMutation = useMutation({
    ...trpc.procurement.invoice.send.mutationOptions(),
    onSuccess: () => {
      toast.success("Invoice sent to client")
      queryClient.invalidateQueries({ queryKey: [["procurement", "invoice", "list"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invoice")
    },
  })

  // Mark unpaid mutation (for overdue)
  const markUnpaidMutation = useMutation({
    ...trpc.procurement.invoice.markUnpaid.mutationOptions(),
    onSuccess: () => {
      toast.success("Invoice marked as unpaid")
      queryClient.invalidateQueries({ queryKey: [["procurement", "invoice", "list"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update invoice")
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  // Calculate summary stats
  const totalOutstanding = (data as any)?.invoices
    ?.filter((inv: any) => ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status))
    ?.reduce((sum: number, inv: any) => sum + inv.total - inv.paidAmount, 0) || 0

  const overdueCount = (data as any)?.invoices?.filter((inv: any) => inv.status === "OVERDUE").length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600">Invoices</h1>
            <p className="text-muted-foreground">
              Manage invoices and track payments
            </p>
          </div>
          <Link href="/seller/invoices/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Invoices</p>
                  <p className="text-2xl font-bold">{data?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold">{overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by invoice number..."
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
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="VIEWED">Viewed</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
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
                    <SelectItem value="invoiceNumber">Invoice Number</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoices
            </CardTitle>
            <CardDescription>
              {data?.total || 0} total invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading invoices
              </div>
            ) : !data?.invoices?.length ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600">No Invoices</h3>
                <p className="text-gray-400 mb-4">
                  {statusFilter !== "all" 
                    ? "No invoices found with the selected filter" 
                    : "You haven't created any invoices yet"}
                </p>
                <Link href="/seller/invoices/new">
                  <Button>Create First Invoice</Button>
                </Link>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>PO Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.invoices.map((invoice) => {
                      const balance = invoice.total - invoice.paidAmount
                      const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && balance > 0

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            <Link 
                              href={`/seller/invoices/${invoice.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {invoice.purchaseOrder ? (
                              <Link 
                                href={`/seller/purchase-orders/${invoice.purchaseOrder.id}`}
                                className="text-gray-600 hover:underline"
                              >
                                {invoice.purchaseOrder.poNumber}
                              </Link>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell>
                            {invoice.dueDate ? (
                              <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                                {formatDate(invoice.dueDate)}
                                {isOverdue && (
                                  <span className="flex items-center gap-1 text-xs">
                                    <Clock className="h-3 w-3" />
                                    Overdue
                                  </span>
                                )}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(invoice.paidAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={balance > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                              {formatCurrency(balance)}
                            </span>
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
                                  <Link href={`/seller/invoices/${invoice.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                {invoice.status === "DRAFT" && (
                                  <DropdownMenuItem
                                    onClick={() => sendMutation.mutate({ id: invoice.id })}
                                    disabled={sendMutation.isPending}
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Send to Client
                                  </DropdownMenuItem>
                                )}
                                {isOverdue && invoice.status !== "OVERDUE" && (
                                  <DropdownMenuItem
                                    onClick={() => markUnpaidMutation.mutate({ id: invoice.id })}
                                    disabled={markUnpaidMutation.isPending}
                                    className="text-red-600"
                                  >
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Mark as Overdue
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
