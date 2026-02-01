"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CalendarIcon,
  Package,
  ShoppingCart,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";

type OrderStatus = "ALL" | "PENDING" | "CONFIRMED" | "PICKING" | "PICKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

const statusOptions: { value: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { value: "ALL", label: "All Orders", icon: <ShoppingCart className="h-4 w-4" /> },
  { value: "PENDING", label: "Pending", icon: <Clock className="h-4 w-4" /> },
  { value: "CONFIRMED", label: "Confirmed", icon: <CheckCircle className="h-4 w-4" /> },
  { value: "PICKING", label: "Picking", icon: <Package className="h-4 w-4" /> },
  { value: "PICKED", label: "Picked", icon: <Package className="h-4 w-4" /> },
  { value: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: <Truck className="h-4 w-4" /> },
  { value: "DELIVERED", label: "Delivered", icon: <CheckCircle className="h-4 w-4" /> },
  { value: "CANCELLED", label: "Cancelled", icon: <XCircle className="h-4 w-4" /> },
];

export default function OrdersPage() {
  // Filters state
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"createdAt" | "total" | "orderNumber">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Simple debounce using timeout
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading, error: ordersError, refetch } = useQuery(
    trpc.seller.getOrders.queryOptions({
      status: selectedStatus,
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      dateFrom: dateFrom?.toISOString(),
      dateTo: dateTo?.toISOString(),
      sortBy,
      sortOrder,
    })
  );

  // Fetch status counts for tabs
  const { data: statusCounts, isLoading: countsLoading } = useQuery(
    trpc.seller.getOrderStatusCounts.queryOptions()
  );

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOrderId(null);
  };

  const handleStatusChange = (status: OrderStatus) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedStatus("ALL");
    setPage(1);
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || selectedStatus !== "ALL";

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            Manage orders containing your products
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => {
          const count = statusCounts?.[option.value] ?? 0;
          const isActive = selectedStatus === option.value;

          return (
            <Button
              key={option.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleStatusChange(option.value)}
              className="flex items-center gap-2"
            >
              {option.icon}
              {option.label}
              {!countsLoading && (
                <Badge variant={isActive ? "secondary" : "outline"} className="ml-1">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by order number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PP") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => {
                    setDateFrom(date);
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PP") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => {
                    setDateTo(date);
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
                setSortBy(field);
                setSortOrder(order);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest first</SelectItem>
                <SelectItem value="createdAt-asc">Oldest first</SelectItem>
                <SelectItem value="total-desc">Highest value</SelectItem>
                <SelectItem value="total-asc">Lowest value</SelectItem>
                <SelectItem value="orderNumber-asc">Order # (A-Z)</SelectItem>
                <SelectItem value="orderNumber-desc">Order # (Z-A)</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : ordersError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <XCircle className="h-12 w-12 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Failed to load orders</h3>
              <p className="text-gray-500 mt-1">{ordersError.message}</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-4">
                Try again
              </Button>
            </div>
          ) : (
            <OrdersTable
              orders={ordersData?.orders ?? []}
              pagination={ordersData?.pagination ?? { page: 1, limit: 20, totalCount: 0, totalPages: 1, hasMore: false }}
              onViewOrder={handleViewOrder}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        open={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
