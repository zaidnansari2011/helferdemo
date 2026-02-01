"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc-provider";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Store,
  CreditCard,
  MapPin,
  User,
  Shield,
  Save,
  Loader2,
  Plus,
  Trash2,
  Star,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
  Globe,
  Instagram,
  Facebook,
  Upload,
} from "lucide-react";

const verificationStatusConfig = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: Clock },
  VERIFIED: { label: "Verified", color: "bg-green-100 text-green-800", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  
  // Fetch settings
  const { data: settings, isLoading, error } = useQuery(
    trpc.seller.getSettings.queryOptions()
  );

  // Business details form state
  const [businessForm, setBusinessForm] = useState({
    brandName: "",
    brandDescription: "",
    brandWebsite: "",
    instagram: "",
    facebook: "",
  });

  // Bank details form state
  const [bankForm, setBankForm] = useState({
    bankAccountNumber: "",
    confirmBankAccountNumber: "",
    ifscCode: "",
    bankType: "SAVINGS" as "SAVINGS" | "CURRENT",
  });

  // New shipping location form state
  const [newLocation, setNewLocation] = useState({
    businessName: "",
    address: "",
    pincode: "",
    state: "",
    isDefault: false,
  });
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);

  // Mutations
  const updateBusinessMutation = useMutation(
    trpc.seller.updateBusinessDetails.mutationOptions({
      onSuccess: () => {
        toast.success("Business details updated successfully");
        queryClient.invalidateQueries({ queryKey: [["seller", "getSettings"]] });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update business details");
      },
    })
  );

  const updateBankMutation = useMutation(
    trpc.seller.updateBankDetails.mutationOptions({
      onSuccess: () => {
        toast.success("Bank details updated successfully");
        queryClient.invalidateQueries({ queryKey: [["seller", "getSettings"]] });
        setBankForm({
          bankAccountNumber: "",
          confirmBankAccountNumber: "",
          ifscCode: "",
          bankType: "SAVINGS",
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update bank details");
      },
    })
  );

  const addLocationMutation = useMutation(
    trpc.seller.addShippingLocation.mutationOptions({
      onSuccess: () => {
        toast.success("Shipping location added successfully");
        queryClient.invalidateQueries({ queryKey: [["seller", "getSettings"]] });
        setIsAddLocationOpen(false);
        setNewLocation({
          businessName: "",
          address: "",
          pincode: "",
          state: "",
          isDefault: false,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add shipping location");
      },
    })
  );

  const deleteLocationMutation = useMutation(
    trpc.seller.deleteShippingLocation.mutationOptions({
      onSuccess: () => {
        toast.success("Shipping location deleted");
        queryClient.invalidateQueries({ queryKey: [["seller", "getSettings"]] });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete shipping location");
      },
    })
  );

  const setDefaultLocationMutation = useMutation(
    trpc.seller.setDefaultShippingLocation.mutationOptions({
      onSuccess: () => {
        toast.success("Default location updated");
        queryClient.invalidateQueries({ queryKey: [["seller", "getSettings"]] });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to set default location");
      },
    })
  );

  // Initialize form when data loads
  useState(() => {
    if (settings) {
      setBusinessForm({
        brandName: settings.businessDetails.brandName,
        brandDescription: settings.businessDetails.brandDescription,
        brandWebsite: settings.businessDetails.brandWebsite,
        instagram: settings.businessDetails.socialChannels?.instagram || "",
        facebook: settings.businessDetails.socialChannels?.facebook || "",
      });
    }
  });

  const handleSaveBusinessDetails = () => {
    updateBusinessMutation.mutate({
      brandName: businessForm.brandName,
      brandDescription: businessForm.brandDescription,
      brandWebsite: businessForm.brandWebsite,
      socialChannels: {
        instagram: businessForm.instagram,
        facebook: businessForm.facebook,
      },
    });
  };

  const handleSaveBankDetails = () => {
    if (bankForm.bankAccountNumber !== bankForm.confirmBankAccountNumber) {
      toast.error("Bank account numbers do not match");
      return;
    }
    updateBankMutation.mutate(bankForm);
  };

  const handleAddLocation = () => {
    addLocationMutation.mutate(newLocation);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load settings</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  const StatusBadge = ({ status }: { status: keyof typeof verificationStatusConfig }) => {
    const config = verificationStatusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your store settings and preferences</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="business" className="data-[state=active]:bg-white gap-2">
            <Store className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-white gap-2">
            <CreditCard className="h-4 w-4" />
            Bank Details
          </TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-white gap-2">
            <MapPin className="h-4 w-4" />
            Shipping Locations
          </TabsTrigger>
          <TabsTrigger value="account" className="data-[state=active]:bg-white gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Business Details Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Business Details
              </CardTitle>
              <CardDescription>
                Update your store information and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name *</Label>
                  <Input
                    id="brandName"
                    value={businessForm.brandName || settings.businessDetails.brandName}
                    onChange={(e) => setBusinessForm({ ...businessForm, brandName: e.target.value })}
                    placeholder="Your brand name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandWebsite">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="brandWebsite"
                      className="pl-10"
                      value={businessForm.brandWebsite || settings.businessDetails.brandWebsite}
                      onChange={(e) => setBusinessForm({ ...businessForm, brandWebsite: e.target.value })}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brandDescription">Brand Description</Label>
                <Textarea
                  id="brandDescription"
                  value={businessForm.brandDescription || settings.businessDetails.brandDescription}
                  onChange={(e) => setBusinessForm({ ...businessForm, brandDescription: e.target.value })}
                  placeholder="Describe your brand and what you sell..."
                  rows={3}
                />
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Social Media Links</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="instagram"
                        className="pl-10"
                        value={businessForm.instagram || settings.businessDetails.socialChannels?.instagram || ""}
                        onChange={(e) => setBusinessForm({ ...businessForm, instagram: e.target.value })}
                        placeholder="@yourhandle"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <div className="relative">
                      <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="facebook"
                        className="pl-10"
                        value={businessForm.facebook || settings.businessDetails.socialChannels?.facebook || ""}
                        onChange={(e) => setBusinessForm({ ...businessForm, facebook: e.target.value })}
                        placeholder="facebook.com/yourpage"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">GST Information</h4>
                  <p className="text-sm text-gray-500">Your registered GST details (read-only)</p>
                </div>
                <StatusBadge status={settings.gstDetails.gstVerificationStatus} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    value={settings.gstDetails.gstNumber}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Legal Business Name</Label>
                  <Input
                    value={settings.gstDetails.legalBusinessName}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveBusinessDetails}
                  disabled={updateBusinessMutation.isPending}
                  className="bg-brand-red hover:bg-brand-red-dark"
                >
                  {updateBusinessMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Bank Details
                  </CardTitle>
                  <CardDescription>
                    Your bank account for receiving payments
                  </CardDescription>
                </div>
                <StatusBadge status={settings.bankDetails.bankVerificationStatus} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Bank Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-gray-500">Current Bank Account</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Account Number</p>
                    <p className="font-medium">
                      {settings.bankDetails.bankAccountNumber 
                        ? `XXXX${settings.bankDetails.bankAccountNumber.slice(-4)}`
                        : "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">IFSC Code</p>
                    <p className="font-medium">{settings.bankDetails.ifscCode || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Account Type</p>
                    <p className="font-medium capitalize">
                      {settings.bankDetails.bankType?.toLowerCase() || "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Update Bank Details</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Enter new bank details below. Verification will reset and needs to be re-verified.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number *</Label>
                    <Input
                      id="bankAccountNumber"
                      type="password"
                      value={bankForm.bankAccountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmBankAccountNumber">Confirm Account Number *</Label>
                    <Input
                      id="confirmBankAccountNumber"
                      value={bankForm.confirmBankAccountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, confirmBankAccountNumber: e.target.value })}
                      placeholder="Re-enter account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code *</Label>
                    <Input
                      id="ifscCode"
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., SBIN0001234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankType">Account Type *</Label>
                    <Select
                      value={bankForm.bankType}
                      onValueChange={(value: "SAVINGS" | "CURRENT") => 
                        setBankForm({ ...bankForm, bankType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAVINGS">Savings Account</SelectItem>
                        <SelectItem value="CURRENT">Current Account</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveBankDetails}
                  disabled={updateBankMutation.isPending || !bankForm.bankAccountNumber || !bankForm.ifscCode}
                  className="bg-brand-red hover:bg-brand-red-dark"
                >
                  {updateBankMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Bank Details
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Locations
                  </CardTitle>
                  <CardDescription>
                    Manage your pickup and shipping addresses
                  </CardDescription>
                </div>
                <Dialog open={isAddLocationOpen} onOpenChange={setIsAddLocationOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-brand-red hover:bg-brand-red-dark">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Shipping Location</DialogTitle>
                      <DialogDescription>
                        Add a new address for shipping and pickup
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="newBusinessName">Business Name</Label>
                        <Input
                          id="newBusinessName"
                          value={newLocation.businessName}
                          onChange={(e) => setNewLocation({ ...newLocation, businessName: e.target.value })}
                          placeholder="Store/Warehouse name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newAddress">Address</Label>
                        <Textarea
                          id="newAddress"
                          value={newLocation.address}
                          onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                          placeholder="Full address"
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPincode">Pincode</Label>
                          <Input
                            id="newPincode"
                            value={newLocation.pincode}
                            onChange={(e) => setNewLocation({ ...newLocation, pincode: e.target.value })}
                            placeholder="6-digit pincode"
                            maxLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newState">State</Label>
                          <Input
                            id="newState"
                            value={newLocation.state}
                            onChange={(e) => setNewLocation({ ...newLocation, state: e.target.value })}
                            placeholder="State"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddLocationOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddLocation}
                        disabled={addLocationMutation.isPending || !newLocation.businessName || !newLocation.address}
                        className="bg-brand-red hover:bg-brand-red-dark"
                      >
                        {addLocationMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          "Add Location"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {settings.shippingLocations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 mb-1">No shipping locations</h3>
                  <p className="text-sm text-gray-500">Add your first shipping location to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {settings.shippingLocations.map((location) => (
                    <div
                      key={location.id}
                      className={`border rounded-lg p-4 ${
                        location.isDefault ? "border-brand-red bg-red-50" : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{location.businessName}</span>
                            {location.isDefault && (
                              <Badge className="bg-brand-red text-white">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{location.address}</p>
                          <p className="text-sm text-gray-500">
                            {location.state} - {location.pincode}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!location.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDefaultLocationMutation.mutate({ locationId: location.id })}
                              disabled={setDefaultLocationMutation.isPending}
                            >
                              Set as Default
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Location?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this shipping location? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteLocationMutation.mutate({ locationId: location.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>
                    Your account details and verification status
                  </CardDescription>
                </div>
                <StatusBadge status={settings.accountDetails.verificationStatus} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={settings.accountDetails.name}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={settings.accountDetails.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={settings.accountDetails.phone || "Not provided"}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Approved On</Label>
                  <Input
                    value={
                      settings.accountDetails.approvedAt
                        ? new Date(settings.accountDetails.approvedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "Pending approval"
                    }
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <Separator />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Account Security</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      To change your email or phone number, please contact support. This helps keep your account secure.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
