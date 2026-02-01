"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc-provider"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Send, 
  Trash2, 
  XCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { PIStatus } from "@prisma/client"

// PI Status Badge Component
const PIStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700 border-gray-200" },
    SENT: { label: "Sent", className: "bg-blue-100 text-blue-700 border-blue-200" },
    UNDER_REVIEW: { label: "Under Review", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    APPROVED: { label: "Approved", className: "bg-green-100 text-green-700 border-green-200" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
    FULFILLED: { label: "Fulfilled", className: "bg-purple-100 text-purple-700 border-purple-200" },
    BILLED: { label: "Billed", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200" },
  }
  
  const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" }
  
  return (
    <Badge variant="outline" className={`${config.className} font-medium`}>
      {config.label}
    </Badge>
  )
}

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount).replace('$', '₹')
}

// Format date
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function ProformaInvoicesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<PIStatus | "ALL">("ALL")
  const [sortBy, setSortBy] = useState<"createdAt" | "total" | "piNumber" | "validUntil">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPI, setSelectedPI] = useState<string | null>(null)

  // Fetch PIs
  const { data, isLoading, error } = useQuery({
    ...trpc.procurement.pi.list.queryOptions({
      page,
      limit: 10,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      search: search || undefined,
      sortBy,
      sortOrder,
    }),
  })

  // Mutations
  const sendMutation = useMutation({
    ...trpc.procurement.pi.send.mutationOptions(),
    onSuccess: () => {
      toast.success("PI sent to client successfully")
      queryClient.invalidateQueries({ queryKey: [["procurement", "pi", "list"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send PI")
    },
  })

  const cancelMutation = useMutation({
    ...trpc.procurement.pi.cancel.mutationOptions(),
    onSuccess: () => {
      toast.success("PI cancelled")
      queryClient.invalidateQueries({ queryKey: [["procurement", "pi", "list"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel PI")
    },
  })

  const deleteMutation = useMutation({
    ...trpc.procurement.pi.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("PI deleted")
      setDeleteDialogOpen(false)
      setSelectedPI(null)
      queryClient.invalidateQueries({ queryKey: [["procurement", "pi", "list"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete PI")
    },
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value as PIStatus | "ALL")
    setPage(1)
  }

  const handleSend = (id: string) => {
    sendMutation.mutate({ id })
  }

  const handleCancel = (id: string) => {
    cancelMutation.mutate({ id })
  }

  const handleDelete = () => {
    if (selectedPI) {
      deleteMutation.mutate({ id: selectedPI })
    }
  }

  const confirmDelete = (id: string) => {
    setSelectedPI(id)
    setDeleteDialogOpen(true)
  }

  const pis = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600">Proforma Invoices</h1>
            <p className="text-muted-foreground">
              Create and manage your proforma invoices
            </p>
          </div>
          <Link href="/seller/proforma-invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New PI
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by PI number..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                  <SelectItem value="BILLED">Billed</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="total">Amount</SelectItem>
                  <SelectItem value="piNumber">PI Number</SelectItem>
                  <SelectItem value="validUntil">Valid Until</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PI Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">Failed to load proforma invoices</p>
              </div>
            ) : pis.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 mb-3">No proforma invoices found</p>
                <Link href="/seller/proforma-invoices/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Create First PI
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PI Number</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Related</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pis.map((pi) => (
                      <TableRow key={pi.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <Link
                            href={`/seller/proforma-invoices/${pi.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {pi.piNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(pi.createdAt)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              new Date(pi.validUntil) < new Date()
                                ? "text-red-500"
                                : ""
                            }
                          >
                            {formatDate(pi.validUntil)}
                          </span>
                        </TableCell>
                        <TableCell>{pi.items.length} items</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(pi.total)}
                        </TableCell>
                        <TableCell>
                          <PIStatusBadge status={pi.status} />
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-500">
                            {pi._count.purchaseOrders > 0 && (
                              <span className="text-purple-600">
                                {pi._count.purchaseOrders} PO(s)
                              </span>
                            )}
                            {pi._count.invoices > 0 && (
                              <span className="text-green-600 ml-2">
                                {pi._count.invoices} Invoice(s)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/seller/proforma-invoices/${pi.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              
                              {pi.status === "DRAFT" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/seller/proforma-invoices/${pi.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSend(pi.id)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send to Client
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {["DRAFT", "SENT"].includes(pi.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleCancel(pi.id)}
                                    className="text-yellow-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel PI
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {["DRAFT", "CANCELLED"].includes(pi.status) && (
                                <DropdownMenuItem
                                  onClick={() => confirmDelete(pi.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
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
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <p className="text-sm text-gray-500">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                      {pagination.total} results
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-500">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proforma Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              proforma invoice and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
