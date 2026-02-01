import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteToAdmin() {
  // Find the email to promote - change this to your email
  const emailToPromote = process.argv[2];
  
  if (!emailToPromote) {
    console.log('Usage: bun run promote-admin.ts <email>');
    console.log('');
    console.log('Available users:');
    const users = await prisma.user.findMany({
      include: { profile: true },
      take: 20
    });
    for (const user of users) {
      console.log(`  - ${user.email} (${user.profile?.role || 'NO PROFILE'})`);
    }
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: emailToPromote },
    include: { profile: true }
  });

  if (!user) {
    console.error(`User with email ${emailToPromote} not found`);
    process.exit(1);
  }

  if (!user.profile) {
    // Create profile with ADMIN role
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        role: 'ADMIN',
        verificationStatus: 'VERIFIED',
        onboardingStep: 6,
      }
    });
    console.log(`✅ Created admin profile for ${emailToPromote}`);
  } else {
    // Update existing profile to ADMIN
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { role: 'ADMIN' }
    });
    console.log(`✅ Updated ${emailToPromote} to ADMIN role (was ${user.profile.role})`);
  }

  await prisma.$disconnect();
}

promoteToAdmin().catch(console.error);
