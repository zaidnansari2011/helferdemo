"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Building2, 
  MapPin, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Layers,
  Grid3X3,
  Package,
  Box,
  QrCode
} from "lucide-react";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { HierarchyCreateModal } from "@/components/warehouse/HierarchyCreateModal";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { BarcodeComponent } from "@/components/ui/Barcode";

interface WarehouseDetailsModalProps {
  warehouseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HierarchyLevel = "floorPlan" | "area" | "rack" | "shelf" | "bin";

interface CreateModalState {
  open: boolean;
  type: HierarchyLevel | null;
  parentId: string | null;
  parentData?: any;
}

export function WarehouseDetailsModal({ warehouseId, open, onOpenChange }: WarehouseDetailsModalProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [createModal, setCreateModal] = useState<CreateModalState>({
    open: false,
    type: null,
    parentId: null,
  });

  const { 
    data: warehouse, 
    isLoading, 
    refetch 
  } = useQuery(trpc.warehouse.getById.queryOptions({ id: warehouseId }))

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const openCreateModal = (type: HierarchyLevel, parentId: string, parentData?: any) => {
    setCreateModal({ open: true, type, parentId, parentData });
  };

  const closeCreateModal = () => {
    setCreateModal({ open: false, type: null, parentId: null });
  };

  const handleCreateSuccess = () => {
    refetch();
    closeCreateModal();
  };

  const generateLocationCode = (bin: any): string => {
    const floor = bin.shelf.rack.area.floorPlan.floor;
    const areaCode = bin.shelf.rack.area.code;
    const rackNumber = bin.shelf.rack.number.padStart(3, '0');
    const shelfLevel = bin.shelf.level.toString().padStart(2, '0');
    const binCode = bin.code;
    return `${floor}-${areaCode}-${rackNumber}-${shelfLevel}-${binCode}`;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!warehouse) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[60vw] !w-[60vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {warehouse.name}
          </DialogTitle>
          <DialogDescription>
            Manage warehouse structure and storage locations
          </DialogDescription>
        </DialogHeader>

        {/* Warehouse Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Warehouse Information</CardTitle>
                <CardDescription>Code: {warehouse.code}</CardDescription>
              </div>
              <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                {warehouse.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm">{warehouse.address}</p>
                <p className="text-xs text-gray-500">PIN: {warehouse.pincode}</p>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Shipping Location: </span>
              <span className="font-medium">{warehouse.shippingLocation.businessName}</span>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchy Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Storage Structure</CardTitle>
                <CardDescription>Manage floors, areas, racks, shelves, and bins</CardDescription>
              </div>
              <Button 
                onClick={() => openCreateModal("floorPlan", warehouse.id)}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Floor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {warehouse.floorPlans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Layers className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No floor plans created yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => openCreateModal("floorPlan", warehouse.id)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Floor
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {warehouse.floorPlans.map((floor) => (
                  <div key={floor.id} className="border rounded-lg">
                    {/* Floor Header */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(floor.id)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedItems.has(floor.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Layers className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Floor {floor.floor}</span>
                        <Badge variant="outline">{floor.areas.length} areas</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCreateModal("area", floor.id, { floor: floor.floor })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Area
                      </Button>
                    </div>

                    {/* Floor Content */}
                    {expandedItems.has(floor.id) && (
                      <div className="p-3 space-y-2">
                        {floor.areas.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No areas created yet
                          </div>
                        ) : (
                          floor.areas.map((area) => (
                            <div key={area.id} className="ml-4 border-l-2 border-gray-200 pl-4">
                              {/* Area Header */}
                              <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpanded(area.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    {expandedItems.has(area.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Grid3X3 className="h-4 w-4 text-green-600" />
                                  <span className="font-medium">{area.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {area.code}
                                  </Badge>
                                  <Badge variant="outline">{area.racks.length} racks</Badge>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openCreateModal("rack", area.id, { 
                                    floor: floor.floor, 
                                    area: area.name 
                                  })}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Rack
                                </Button>
                              </div>

                              {/* Area Content */}
                              {expandedItems.has(area.id) && (
                                <div className="space-y-2">
                                  {area.racks.length === 0 ? (
                                    <div className="text-center py-2 text-gray-500 text-sm">
                                      No racks created yet
                                    </div>
                                  ) : (
                                    area.racks.map((rack) => (
                                      <div key={rack.id} className="ml-4 border-l-2 border-gray-200 pl-4">
                                        {/* Rack Header */}
                                        <div className="flex items-center justify-between py-2">
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => toggleExpanded(rack.id)}
                                              className="h-6 w-6 p-0"
                                            >
                                              {expandedItems.has(rack.id) ? (
                                                <ChevronDown className="h-4 w-4" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4" />
                                              )}
                                            </Button>
                                            <Package className="h-4 w-4 text-orange-600" />
                                            <span className="font-medium">Rack {rack.number}</span>
                                            <Badge variant="outline">{rack.shelves.length} shelves</Badge>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openCreateModal("shelf", rack.id, {
                                              floor: floor.floor,
                                              area: area.name,
                                              rack: rack.number
                                            })}
                                          >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Shelf
                                          </Button>
                                        </div>

                                        {/* Rack Content */}
                                        {expandedItems.has(rack.id) && (
                                          <div className="space-y-2">
                                            {rack.shelves.length === 0 ? (
                                              <div className="text-center py-2 text-gray-500 text-sm">
                                                No shelves created yet
                                              </div>
                                            ) : (
                                              rack.shelves.map((shelf) => (
                                                <div key={shelf.id} className="ml-4 border-l-2 border-gray-200 pl-4">
                                                  {/* Shelf Header */}
                                                  <div className="flex items-center justify-between py-2">
                                                    <div className="flex items-center gap-2">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleExpanded(shelf.id)}
                                                        className="h-6 w-6 p-0"
                                                      >
                                                        {expandedItems.has(shelf.id) ? (
                                                          <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                          <ChevronRight className="h-4 w-4" />
                                                        )}
                                                      </Button>
                                                      <Box className="h-4 w-4 text-purple-600" />
                                                      <span className="font-medium">Level {shelf.level}</span>
                                                      <Badge variant="outline">{shelf.bins.length} bins</Badge>
                                                    </div>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => openCreateModal("bin", shelf.id, {
                                                        floor: floor.floor,
                                                        area: area.name,
                                                        rack: rack.number,
                                                        shelf: shelf.level
                                                      })}
                                                    >
                                                      <Plus className="mr-2 h-4 w-4" />
                                                      Add Bin
                                                    </Button>
                                                  </div>

                                                  {/* Shelf Content */}
                                                  {expandedItems.has(shelf.id) && (
                                                    <div className="space-y-1">
                                                      {shelf.bins.length === 0 ? (
                                                        <div className="text-center py-2 text-gray-500 text-sm">
                                                          No bins created yet
                                                        </div>
                                                      ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                          {shelf.bins.map((bin) => {
                                                            const locationCode = generateLocationCode({
                                                              ...bin,
                                                              shelf: {
                                                                ...shelf,
                                                                rack: {
                                                                  ...rack,
                                                                  area: {
                                                                    ...area,
                                                                    floorPlan: floor
                                                                  }
                                                                }
                                                              }
                                                            });
                                                            
                                                            return (
                                                              <div 
                                                                key={bin.id} 
                                                                className="flex flex-col gap-2 p-3 bg-white rounded-md border"
                                                              >
                                                                <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-2">
                                                                  <QrCode className="h-3 w-3 text-gray-600" />
                                                                    <span className="font-medium text-sm">Bin {bin.code}</span>
                                                                    <Badge variant="secondary" className="text-xs">
                                                                      {bin._count?.productLocations || 0} items
                                                                    </Badge>
                                                                  </div>
                                                                </div>
                                                                <BarcodeComponent
                                                                  value={locationCode}
                                                                  label={`${warehouse.name} - Floor ${floor.floor} - ${area.name} - Rack ${rack.number} - Level ${shelf.level} - Bin ${bin.code}`}
                                                                  width={1.2}
                                                                  height={30}
                                                                  fontSize={8}
                                                                  className="self-center"
                                                                />
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        <HierarchyCreateModal
          open={createModal.open}
          onOpenChange={(open: boolean) => !open && closeCreateModal()}
          type={createModal.type}
          parentId={createModal.parentId}
          parentData={createModal.parentData}
          onSuccess={handleCreateSuccess}
        />
      </DialogContent>
    </Dialog>
  );
} 