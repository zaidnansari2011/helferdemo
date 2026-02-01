"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc-provider"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  ArrowLeft, 
  Send,
  XCircle,
  Edit,
  Loader2,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  RefreshCw,
  Package
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
const PIStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; className: string }> = {
    DRAFT: { variant: "outline", icon: <Edit className="h-3 w-3" />, className: "border-gray-400 text-gray-600" },
    SENT: { variant: "default", icon: <Send className="h-3 w-3" />, className: "bg-blue-500" },
    VIEWED: { variant: "default", icon: <FileText className="h-3 w-3" />, className: "bg-purple-500" },
    ACCEPTED: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-green-500" },
    REJECTED: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, className: "" },
    REVISION_REQUESTED: { variant: "default", icon: <RefreshCw className="h-3 w-3" />, className: "bg-orange-500" },
    PO_GENERATED: { variant: "default", icon: <FileText className="h-3 w-3" />, className: "bg-teal-500" },
    EXPIRED: { variant: "secondary", icon: <Clock className="h-3 w-3" />, className: "" },
    CANCELLED: { variant: "outline", icon: <Ban className="h-3 w-3" />, className: "border-red-400 text-red-600" },
  }

  const cfg = config[status] || { variant: "outline" as const, icon: null, className: "" }

  return (
    <Badge variant={cfg.variant} className={`gap-1 ${cfg.className}`}>
      {cfg.icon}
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

// Credit terms display
const formatCreditTerms = (terms: string) => {
  const mapping: Record<string, string> = {
    IMMEDIATE: "Immediate Payment",
    NET_30: "Net 30 Days",
    NET_60: "Net 60 Days",
    NET_90: "Net 90 Days",
  }
  return mapping[terms] || terms
}

export default function PIDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch PI details
  const { data: pi, isLoading, error } = useQuery({
    ...trpc.procurement.pi.getById.queryOptions({ id }),
  })

  // Send mutation
  const sendMutation = useMutation({
    ...trpc.procurement.pi.send.mutationOptions(),
    onSuccess: () => {
      toast.success("PI sent successfully")
      queryClient.invalidateQueries({ queryKey: [["procurement", "pi", "getById"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send PI")
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    ...trpc.procurement.pi.cancel.mutationOptions(),
    onSuccess: () => {
      toast.success("PI cancelled")
      queryClient.invalidateQueries({ queryKey: [["procurement", "pi", "getById"]] })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel PI")
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !pi) {
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

  const canEdit = pi.status === "DRAFT"
  const canSend = pi.status === "DRAFT"
  const canCancel = ["DRAFT", "SENT", "VIEWED"].includes(pi.status)
  const isExpired = new Date(pi.validUntil) < new Date()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/seller/proforma-invoices">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-red-600">{pi.piNumber}</h1>
                <PIStatusBadge status={pi.status} />
                {isExpired && pi.status !== "EXPIRED" && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Expired
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Created on {formatDate(pi.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {canEdit && (
              <Link href={`/seller/proforma-invoices/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            {canSend && (
              <Button 
                onClick={() => sendMutation.mutate({ id })}
                disabled={sendMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send to Client
              </Button>
            )}
            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Proforma Invoice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this PI? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep PI</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMutation.mutate({ id })}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Cancel PI
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items ({pi.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pi.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.description}</div>
                          {item.product && (
                            <div className="text-sm text-gray-500">
                              SKU: {item.product.name}
                              {item.variant && ` - ${item.variant.name}`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notes */}
            {pi.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{pi.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Related Documents */}
            {pi.purchaseOrders && pi.purchaseOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Related Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pi.purchaseOrders.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">{po.poNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{po.status}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(po.createdAt)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(po.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatCurrency(pi.subtotal)}</span>
                  </div>
                  {pi.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="text-red-500">-{formatCurrency(pi.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax ({pi.taxRate}%)</span>
                    <span>{formatCurrency(pi.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-green-600">{formatCurrency(pi.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Valid Until</p>
                    <p className={`font-medium ${isExpired ? "text-red-500" : ""}`}>
                      {formatDate(pi.validUntil)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Credit Terms</p>
                    <p className="font-medium">{formatCreditTerms(pi.creditTerms)}</p>
                  </div>
                </div>

                {pi.deliveryTerms && (
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Delivery Terms</p>
                      <p className="font-medium">{pi.deliveryTerms}</p>
                    </div>
                  </div>
                )}

                {pi.sentAt && (
                  <div className="flex items-center gap-3">
                    <Send className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Sent On</p>
                      <p className="font-medium">{formatDate(pi.sentAt)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status History */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-gray-500">{formatDate(pi.createdAt)}</p>
                    </div>
                  </div>
                  {pi.sentAt && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Sent to Client</p>
                        <p className="text-xs text-gray-500">{formatDate(pi.sentAt)}</p>
                      </div>
                    </div>
                  )}
                  {pi.status === "ACCEPTED" && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-sm font-medium">Accepted</p>
                        <p className="text-xs text-gray-500">{formatDate(pi.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  {pi.status === "REJECTED" && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                      <div>
                        <p className="text-sm font-medium">Rejected</p>
                        <p className="text-xs text-gray-500">{formatDate(pi.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  {pi.status === "CANCELLED" && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Cancelled</p>
                        <p className="text-xs text-gray-500">{formatDate(pi.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
