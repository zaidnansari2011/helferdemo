"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, FileText, Building2, CreditCard, MapPin, Loader2, ArrowRight, Mail, Phone, RefreshCw } from "lucide-react"
import { trpc } from "@/lib/trpc-provider"
import { useQuery } from "@tanstack/react-query"

export default function SellerPendingPage() {
  const { data: session, isPending: sessionLoading } = useSession()
  const router = useRouter()

  // Get dashboard data to check verification status
  // Important: Add enabled option to only fetch when we have a session
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch, isRefetching } = useQuery({
    ...trpc.seller.getDashboardData.queryOptions(),
    enabled: !!session?.user, // Only run query if user is logged in
    retry: false, // Don't retry on 403 errors
  })

  // Auth redirect logic
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push('/')
    }
  }, [session, sessionLoading, router])

  // If approved (VERIFIED), redirect to dashboard
  useEffect(() => {
    if (dashboardData?.profile?.verificationStatus === "VERIFIED") {
      router.push('/seller')
    }
  }, [dashboardData, router])

  // Show loading while checking auth
  if (sessionLoading || (dashboardLoading && session?.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-navy mx-auto" />
          <p className="mt-4 text-gray-600">Loading your application status...</p>
        </div>
      </div>
    )
  }

  // If no dashboard data (user doesn't have a seller profile) or error, redirect to onboarding
  if (!dashboardData || dashboardError) {
    router.push('/seller/onboarding')
    return null
  }

  const { profile } = dashboardData

  // Define verification steps
  const verificationSteps: Array<{
    id: number
    title: string
    description: string
    icon: typeof FileText
    status: "completed" | "in-progress" | "pending"
  }> = [
    {
      id: 1,
      title: "Application Submitted",
      description: "Your seller application has been received",
      icon: FileText,
      status: "completed"
    },
    {
      id: 2,
      title: "Document Verification",
      description: "Verifying your GST and business documents",
      icon: Building2,
      status: profile.verificationStatus === "IN_PROGRESS" ? "in-progress" : 
             profile.verificationStatus === "VERIFIED" ? "completed" : "pending"
    },
    {
      id: 3,
      title: "Bank Account Verification",
      description: "Verifying your bank account details",
      icon: CreditCard,
      status: profile.verificationStatus === "VERIFIED" ? "completed" : "pending"
    },
    {
      id: 4,
      title: "Warehouse Setup",
      description: "Setting up your shipping location",
      icon: MapPin,
      status: profile.verificationStatus === "VERIFIED" ? "completed" : "pending"
    },
    {
      id: 5,
      title: "Account Activation",
      description: "Your seller account will be activated",
      icon: CheckCircle2,
      status: profile.verificationStatus === "VERIFIED" ? "completed" : "pending"
    }
  ]

  const getStatusColor = (status: "completed" | "in-progress" | "pending") => {
    switch (status) {
      case "completed":
        return "bg-green-500 text-white"
      case "in-progress":
        return "bg-brand-navy text-white animate-pulse"
      case "pending":
        return "bg-gray-200 text-gray-500"
    }
  }

  const getLineColor = (status: "completed" | "in-progress" | "pending") => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "in-progress":
        return "bg-brand-navy/30"
      case "pending":
        return "bg-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Application Under Review</h1>
          <p className="text-gray-600 max-w-lg mx-auto">
            Thank you for applying to become a seller! Our team is reviewing your application. 
            This usually takes 2-3 business days.
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Verification Progress</CardTitle>
                <CardDescription>Track the status of your seller application</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                {isRefetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh Status</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Vertical Timeline */}
            <div className="relative">
              {verificationSteps.map((step, index) => (
                <div key={step.id} className="flex items-start mb-8 last:mb-0">
                  {/* Step Icon */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(step.status)}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    {/* Connecting Line */}
                    {index < verificationSteps.length - 1 && (
                      <div className={`absolute top-10 left-1/2 w-0.5 h-12 -translate-x-1/2 ${getLineColor(verificationSteps[index + 1].status)}`} />
                    )}
                  </div>
                  
                  {/* Step Content */}
                  <div className="ml-4 flex-1">
                    <h3 className={`font-semibold ${step.status === "pending" ? "text-gray-400" : "text-gray-900"}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${step.status === "pending" ? "text-gray-400" : "text-gray-600"}`}>
                      {step.description}
                    </p>
                    {step.status === "in-progress" && (
                      <span className="inline-flex items-center mt-2 text-xs text-brand-navy font-medium">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        In Progress
                      </span>
                    )}
                    {step.status === "completed" && (
                      <span className="inline-flex items-center mt-2 text-xs text-green-600 font-medium">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Application Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Business Name</span>
                <span className="font-medium">{profile.brandName || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Onboarding Step</span>
                <span className="font-medium">{profile.onboardingStep?.replace(/_/g, ' ') || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Application Status</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {profile.verificationStatus === "IN_PROGRESS" ? "In Review" : "Pending Review"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Need Help? */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription>Contact our seller support team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-navy-light flex items-center justify-center">
                  <Mail className="h-5 w-5 text-brand-navy" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email Support</p>
                  <p className="text-sm text-gray-600">seller-support@abez.in</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-navy-light flex items-center justify-center">
                  <Phone className="h-5 w-5 text-brand-navy" />
                </div>
                <div>
                  <p className="text-sm font-medium">Phone Support</p>
                  <p className="text-sm text-gray-600">1800-XXX-XXXX (Mon-Sat, 9AM-6PM)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What's Next Section */}
        <Card className="bg-brand-navy-light border-brand-navy/20">
          <CardContent className="py-6">
            <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-brand-navy mt-0.5 flex-shrink-0" />
                <p>Once approved, you'll receive an email notification and can access your seller dashboard.</p>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-brand-navy mt-0.5 flex-shrink-0" />
                <p>You'll be able to add products, manage inventory, and start receiving orders.</p>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-brand-navy mt-0.5 flex-shrink-0" />
                <p>Our onboarding team may contact you if additional information is required.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home Button */}
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => router.push('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
