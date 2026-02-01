import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDeliveryOnboarding() {
  try {
    // Get the user ID - replace with your actual user ID or email
    const userEmail = process.argv[2]; // Pass email as argument
    
    if (!userEmail) {
      console.error('❌ Please provide user email as argument');
      console.log('Usage: bun reset-delivery-onboarding.ts <email>');
      process.exit(1);
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { profile: true }
    });

    if (!user) {
      console.error(`❌ User not found with email: ${userEmail}`);
      process.exit(1);
    }

    if (!user.profile) {
      console.error(`❌ User profile not found for: ${userEmail}`);
      process.exit(1);
    }

    console.log(`🔄 Resetting delivery onboarding for: ${user.name} (${user.email})`);

    // Reset all delivery partner onboarding fields
    await prisma.userProfile.update({
      where: { id: user.profile.id },
      data: {
        // Reset onboarding step
        partnerOnboardingStep: "PERSONAL_INFO",
        partnerOnboardingCompletedAt: null,
        termsAcceptedAt: null,
        
        // Clear personal info
        dateOfBirth: null,
        gender: null,
        profilePhoto: null,
        
        // Clear address
        currentAddress: null,
        permanentAddress: null,
        
        // Clear emergency contact
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelation: null,
        
        // Clear identity documents
        aadhaarNumber: null,
        aadhaarFrontUrl: null,
        aadhaarBackUrl: null,
        panNumber: null,
        panCardUrl: null,
        drivingLicenseNumber: null,
        drivingLicenseUrl: null,
        
        // Clear vehicle details
        vehicleType: null,
        vehicleNumber: null,
        vehicleModel: null,
        vehicleRcUrl: null,
        vehicleInsuranceUrl: null,
        vehicleInsuranceExpiry: null,
        
        // Clear bank details
        bankAccountNumber: null,
        bankAccountConfirm: null,
        ifscCode: null,
        bankType: null,
        bankVerificationStatus: "PENDING",
        
        // Clear work preference
        preferredWorkingHours: null,
        preferredDeliveryZones: null,
      }
    });

    console.log('✅ Delivery onboarding reset successfully!');
    console.log('📱 You can now start fresh from the beginning.');
    
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDeliveryOnboarding();
