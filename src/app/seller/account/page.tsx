"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Shield
} from "lucide-react";

// DEMO MODE: Mock seller data from onboarding
const sellerData = {
  // Business Information
  businessName: "Demo Tools & Hardware",
  businessType: "Partnership",
  panNumber: "ABCDE1234F",
  gstNumber: "27ABCDE1234F1Z5",
  businessEmail: "demo@helfer.com",
  businessPhone: "+91 9876543210",
  
  // Contact Information
  primaryContact: {
    firstName: "Rajesh",
    surname: "Kumar",
    designation: "Owner",
    phoneNumber: "+91 9876543210",
    email: "rajesh.kumar@demo.com"
  },
  
  secondaryContact: {
    firstName: "Priya",
    surname: "Sharma",
    designation: "Manager",
    phoneNumber: "+91 9876543211",
    email: "priya.sharma@demo.com"
  },
  
  // Registered Address
  registeredAddress: {
    line1: "123, Industrial Estate",
    line2: "Sector 15",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    country: "India"
  },
  
  // Bank Details
  bankDetails: {
    accountNumber: "1234567890",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank",
    branchName: "Andheri West"
  },
  
  // Verification Status
  verificationStatus: "VERIFIED",
  onboardingDate: "2024-12-15",
  lastUpdated: "2026-01-15"
};

export default function AccountPage() {
  const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
    VERIFIED: { label: "Verified", className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
    PENDING: { label: "Pending Verification", className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    REJECTED: { label: "Verification Failed", className: "bg-red-100 text-red-800 border-red-200", icon: Shield },
  };

  const currentStatus = statusConfig[sellerData.verificationStatus] || statusConfig.PENDING;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600">Account Details</h1>
          <p className="text-muted-foreground mt-1">
            Your business information and verification status
          </p>
        </div>
        <Badge variant="outline" className={`${currentStatus.className} px-4 py-2 text-sm font-semibold`}>
          <StatusIcon className="h-4 w-4 mr-2" />
          {currentStatus.label}
        </Badge>
      </div>

      {/* Business Information */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Business Information
          </CardTitle>
          <CardDescription>Your registered business details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Business Name</label>
              <p className="text-base font-semibold">{sellerData.businessName}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Business Type</label>
              <p className="text-base">{sellerData.businessType}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">PAN Number</label>
              <p className="text-base font-mono">{sellerData.panNumber}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">GST Number</label>
              <p className="text-base font-mono">{sellerData.gstNumber}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Business Email
              </label>
              <p className="text-base">{sellerData.businessEmail}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Business Phone
              </label>
              <p className="text-base">{sellerData.businessPhone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-green-600" />
            Contact Information
          </CardTitle>
          <CardDescription>Primary and secondary contact persons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Primary Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Name</label>
                <p className="text-base font-semibold">
                  {sellerData.primaryContact.firstName} {sellerData.primaryContact.surname}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Designation</label>
                <p className="text-base">{sellerData.primaryContact.designation}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <p className="text-base">{sellerData.primaryContact.phoneNumber}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Email</label>
                <p className="text-base">{sellerData.primaryContact.email}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Secondary Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Secondary Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-green-200">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Name</label>
                <p className="text-base font-semibold">
                  {sellerData.secondaryContact.firstName} {sellerData.secondaryContact.surname}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Designation</label>
                <p className="text-base">{sellerData.secondaryContact.designation}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Phone</label>
                <p className="text-base">{sellerData.secondaryContact.phoneNumber}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Email</label>
                <p className="text-base">{sellerData.secondaryContact.email}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Address */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-600" />
            Registered Address
          </CardTitle>
          <CardDescription>Your business registered address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-base">{sellerData.registeredAddress.line1}</p>
            <p className="text-base">{sellerData.registeredAddress.line2}</p>
            <p className="text-base">
              {sellerData.registeredAddress.city}, {sellerData.registeredAddress.state} - {sellerData.registeredAddress.pincode}
            </p>
            <p className="text-base font-medium">{sellerData.registeredAddress.country}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Bank Details
          </CardTitle>
          <CardDescription>Your registered bank account for payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Account Number</label>
              <p className="text-base font-mono">••••••{sellerData.bankDetails.accountNumber.slice(-4)}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">IFSC Code</label>
              <p className="text-base font-mono">{sellerData.bankDetails.ifscCode}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Bank Name</label>
              <p className="text-base">{sellerData.bankDetails.bankName}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Branch Name</label>
              <p className="text-base">{sellerData.bankDetails.branchName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Timeline */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Account Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Account Created</span>
              </div>
              <span className="text-sm text-gray-600">
                {new Date(sellerData.onboardingDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Last Updated</span>
              </div>
              <span className="text-sm text-gray-600">
                {new Date(sellerData.lastUpdated).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
