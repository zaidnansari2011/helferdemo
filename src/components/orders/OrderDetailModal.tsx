"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  Truck,
  Clock,
  MessageSquare,
  Building2,
  Send,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { trpc, trpcClient, queryClient } from "@/lib/trpc-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface OrderDetailModalProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  PICKING: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  PICKED: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  OUT_FOR_DELIVERY: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  DELIVERED: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const statusTimeline = [
  "PENDING",
  "CONFIRMED",
  "PICKING",
  "PICKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export function OrderDetailModal({ orderId, open, onClose }: OrderDetailModalProps) {
  const [note, setNote] = useState("");

  const { data: order, isLoading, error, refetch } = useQuery({
    ...trpc.seller.getOrderById.queryOptions({ orderId: orderId || "" }),
    enabled: !!orderId && open,
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: { orderId: string; note: string }) =>
      trpcClient.seller.addOrderNote.mutate(data),
    onSuccess: () => {
      toast.success("Note added successfully");
      setNote("");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to add note");
      console.error(error);
    },
  });

  const handleAddNote = () => {
    if (!orderId || !note.trim()) return;
    addNoteMutation.mutate({ orderId, note: note.trim() });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusDisplay = (status: string) => {
    return status.replace(/_/g, " ");
  };

  const getCurrentStatusIndex = (status: string) => {
    if (status === "CANCELLED") return -1;
    return statusTimeline.indexOf(status);
  };

  const getProductImage = (images: string) => {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return null;
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    Order {order?.orderNumber}
                  </DialogTitle>
                  <DialogDescription>
                    {order ? format(new Date(order.createdAt), "PPpp") : "Loading..."}
                  </DialogDescription>
                </div>
                {order && (
                  <Badge
                    className={`${statusColors[order.status]?.bg} ${statusColors[order.status]?.text} ${statusColors[order.status]?.border} border`}
                  >
                    {getStatusDisplay(order.status)}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-500">Failed to load order details</p>
                <Button variant="outline" onClick={() => refetch()} className="mt-2">
                  Retry
                </Button>
              </div>
            )}

            {order && (
              <div className="space-y-6 mt-6">
                {/* Status Timeline */}
                {order.status !== "CANCELLED" && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Order Progress
                    </h3>
                    <div className="flex items-center justify-between">
                      {statusTimeline.map((status, index) => {
                        const currentIndex = getCurrentStatusIndex(order.status);
                        const isCompleted = index <= currentIndex;
                        const isCurrent = index === currentIndex;

                        return (
                          <div key={status} className="flex flex-col items-center flex-1">
                            <div className="flex items-center w-full">
                              {index > 0 && (
                                <div
                                  className={`flex-1 h-1 ${
                                    index <= currentIndex ? "bg-green-500" : "bg-gray-200"
                                  }`}
                                />
                              )}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                  isCompleted
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-200 text-gray-500"
                                } ${isCurrent ? "ring-2 ring-green-300" : ""}`}
                              >
                                {index + 1}
                              </div>
                              {index < statusTimeline.length - 1 && (
                                <div
                                  className={`flex-1 h-1 ${
                                    index < currentIndex ? "bg-green-500" : "bg-gray-200"
                                  }`}
                                />
                              )}
                            </div>
                            <span className="text-xs mt-2 text-center text-gray-600">
                              {getStatusDisplay(status)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {order.status === "CANCELLED" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-1">Order Cancelled</h3>
                    <p className="text-sm text-red-600">
                      This order was cancelled and will not be fulfilled.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{order.user.user.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{order.user.user.email}</span>
                      </div>
                      {order.user.user.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{order.user.user.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-medium">{order.address.title}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.address.fullAddress}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Pincode: {order.address.pincode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fulfillment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Warehouse
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-medium">{order.warehouse.name}</p>
                      <p className="text-sm text-gray-500">Code: {order.warehouse.code}</p>
                    </div>
                  </div>

                  {(order.pickupHelper || order.deliveryDriver) && (
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Fulfillment Team
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {order.pickupHelper && (
                          <div>
                            <p className="text-xs text-gray-500">Pickup Helper</p>
                            <p className="font-medium">{order.pickupHelper.user.name}</p>
                          </div>
                        )}
                        {order.deliveryDriver && (
                          <div>
                            <p className="text-xs text-gray-500">Delivery Driver</p>
                            <p className="font-medium">{order.deliveryDriver.user.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Order Items */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Your Items in This Order ({order.sellerItemsCount} items)
                  </h3>
                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const image = getProductImage(item.product.images);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={item.product.name}
                              className="h-16 w-16 rounded-md object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-500">
                              Variant: {item.productVariant.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              SKU: {item.productVariant.sku}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Your Revenue from This Order</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items Total</span>
                      <span className="font-medium">{formatCurrency(order.sellerItemsTotal)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Your Total</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(order.sellerItemsTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Ordered</p>
                    <p className="text-sm font-medium">
                      {format(new Date(order.createdAt), "PP")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(order.createdAt), "p")}
                    </p>
                  </div>
                  {order.pickedAt && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Picked</p>
                      <p className="text-sm font-medium">
                        {format(new Date(order.pickedAt), "PP")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(order.pickedAt), "p")}
                      </p>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600">Delivered</p>
                      <p className="text-sm font-medium">
                        {format(new Date(order.deliveredAt), "PP")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(order.deliveredAt), "p")}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Notes Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Order Notes
                  </h3>

                  {order.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700">
                        {order.notes}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a note to this order..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!note.trim() || addNoteMutation.isPending}
                      className="self-end"
                    >
                      {addNoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
