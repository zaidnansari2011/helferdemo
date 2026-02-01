"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    id: string;
    name: string;
    images: string;
    sku: string;
  };
  productVariant: {
    id: string;
    name: string;
    sku: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
  paymentStatus: string;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: Date;
  pickedAt: Date | null;
  deliveredAt: Date | null;
  sellerItemsTotal: number;
  sellerItemsCount: number;
  user: {
    user: {
      name: string;
      email: string;
      phoneNumber: string | null;
    };
  };
  address: {
    title: string;
    fullAddress: string;
    pincode: string;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
  items: OrderItem[];
}

interface OrdersTableProps {
  orders: Order[];
  onViewOrder: (orderId: string) => void;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
  onPageChange: (page: number) => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800" },
  CONFIRMED: { bg: "bg-blue-100", text: "text-blue-800" },
  PICKING: { bg: "bg-purple-100", text: "text-purple-800" },
  PICKED: { bg: "bg-indigo-100", text: "text-indigo-800" },
  OUT_FOR_DELIVERY: { bg: "bg-orange-100", text: "text-orange-800" },
  DELIVERED: { bg: "bg-green-100", text: "text-green-800" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800" },
};

const paymentStatusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-800" },
  FAILED: { bg: "bg-red-100", text: "text-red-800" },
  REFUNDED: { bg: "bg-gray-100", text: "text-gray-800" },
};

export function OrdersTable({ orders, onViewOrder, pagination, onPageChange }: OrdersTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusDisplay = (status: string) => {
    return status.replace(/_/g, " ");
  };

  const getFirstProductImage = (items: OrderItem[]) => {
    if (items.length === 0) return null;
    try {
      const images = JSON.parse(items[0].product.images);
      return Array.isArray(images) && images.length > 0 ? images[0] : null;
    } catch {
      return null;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">No orders found</h3>
        <p className="text-gray-500 mt-1">
          Orders containing your products will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Your Revenue</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusColor = statusColors[order.status] || statusColors.PENDING;
              const paymentColor = paymentStatusColors[order.paymentStatus] || paymentStatusColors.PENDING;
              const productImage = getFirstProductImage(order.items);

              return (
                <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt="Product"
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <span className="text-sm font-mono">
                        {order.orderNumber}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.user.user.name}</p>
                      <p className="text-sm text-gray-500">{order.user.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{order.sellerItemsCount}</span>
                      <span className="text-gray-500"> items</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>
                      {getStatusDisplay(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${paymentColor.bg} ${paymentColor.text} border-0`}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.sellerItemsTotal)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(order.createdAt), "MMM d, yyyy")}</p>
                      <p className="text-gray-500">{format(new Date(order.createdAt), "h:mm a")}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewOrder(order.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
            {pagination.totalCount} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
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
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasMore}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
