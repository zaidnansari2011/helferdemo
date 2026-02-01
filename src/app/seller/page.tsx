"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowRight, 
  AlertCircle,
  ClipboardList,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Plus,
  Eye,
  Send
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

type Period = "7d" | "30d" | "90d" | "12m" | "all"

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

// PO Status Badge Component
const POStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    ACKNOWLEDGED: { label: "Acknowledged", className: "bg-blue-100 text-blue-700 border-blue-200" },
    IN_PROGRESS: { label: "In Progress", className: "bg-purple-100 text-purple-700 border-purple-200" },
    SHIPPED: { label: "Shipped", className: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    DELIVERED: { label: "Delivered", className: "bg-green-100 text-green-700 border-green-200" },
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
  }).format(amount)
}

// Format date
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function SellerDashboard() {
  const [period, setPeriod] = useState<Period>("30d")

  // DEMO MODE: Mock data
  const profile = {
    brandName: "Demo Tools & Hardware",
    verificationStatus: "VERIFIED"
  }

  const b2bSummary = {
    proformaInvoices: { total: 12, draft: 2, sent: 5, totalValue: 485000 },
    purchaseOrders: { inProgress: 3, pending: 1, delivered: 8 },
    payments: { pending: 125000, overdue: 25000, collected: 360000 },
    invoices: { unpaid: 3, paid: 9 }
  }

  const recentPIs = [
    { id: "1", piNumber: "PI-2024-001", status: "APPROVED", createdAt: new Date(), items: [{}, {}, {}], total: 75000 },
    { id: "2", piNumber: "PI-2024-002", status: "SENT", createdAt: new Date(), items: [{}, {}], total: 42000 },
    { id: "3", piNumber: "PI-2024-003", status: "DRAFT", createdAt: new Date(), items: [{}], total: 18500 },
  ]

  const recentPOs = [
    { id: "1", poNumber: "PO-2024-001", status: "DELIVERED", createdAt: new Date(), items: [{}, {}, {}], total: 75000, pi: { piNumber: "PI-2024-001" } },
    { id: "2", poNumber: "PO-2024-002", status: "IN_PROGRESS", createdAt: new Date(), items: [{}, {}], total: 42000, pi: { piNumber: "PI-2024-002" } },
  ]

  const isVerified = profile.verificationStatus === "VERIFIED"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-600">Seller Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your proforma invoices, purchase orders, and billing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {/* Verification Status Banner */}
        {isVerified && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-green-800">Account Verified</p>
                <p className="text-sm text-green-700">
                  Welcome, {profile.brandName}! You can create PIs and manage your B2B transactions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* PIs Raised */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">PIs Raised</CardTitle>
              <FileText className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {b2bSummary.proformaInvoices.total}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(b2bSummary.proformaInvoices.totalValue)} total value
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {b2bSummary.proformaInvoices.draft} draft
                </Badge>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  {b2bSummary.proformaInvoices.sent} sent
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Active POs */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active POs</CardTitle>
              <ClipboardList className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {b2bSummary.purchaseOrders.inProgress}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {b2bSummary.purchaseOrders.pending} pending acknowledgement
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  {b2bSummary.purchaseOrders.delivered} delivered
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Payments</CardTitle>
              <Clock className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(b2bSummary.payments.pending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {b2bSummary.invoices.unpaid} unpaid invoices
              </p>
              {b2bSummary.payments.overdue > 0 && (
                <Badge variant="destructive" className="text-xs mt-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {formatCurrency(b2bSummary.payments.overdue)} overdue
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Revenue Collected</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(b2bSummary.payments.collected)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {b2bSummary.invoices.paid} invoices paid
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">From {b2bSummary.purchaseOrders.delivered} deliveries</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent PIs and POs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Proforma Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Recent Proforma Invoices
                </CardTitle>
                <CardDescription>Your latest PIs</CardDescription>
              </div>
              <Link href="/seller/proforma-invoices">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPIs.map((pi) => (
                  <div
                    key={pi.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{pi.piNumber}</span>
                        <PIStatusBadge status={pi.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(pi.createdAt)} • {pi.items.length} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(pi.total)}</p>
                      <Link href={`/seller/proforma-invoices/${pi.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Purchase Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-purple-500" />
                  Recent Purchase Orders
                </CardTitle>
                <CardDescription>POs received from client</CardDescription>
              </div>
              <Link href="/seller/purchase-orders">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPOs.map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{po.poNumber}</span>
                        <POStatusBadge status={po.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(po.createdAt)} • {po.items.length} items
                        {po.pi && <span> • From {po.pi.piNumber}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(po.total)}</p>
                      <Link href={`/seller/purchase-orders/${po.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
