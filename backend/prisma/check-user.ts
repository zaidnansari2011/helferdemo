import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const emailToCheck = process.argv[2] || '5784955675@temp.blinkit.com';
  
  console.log(`\n🔍 Checking user: ${emailToCheck}\n`);

  const user = await prisma.user.findUnique({
    where: { email: emailToCheck },
    include: { 
      profile: true,
      accounts: true 
    }
  });

  if (!user) {
    console.error(`❌ User with email ${emailToCheck} not found`);
    console.log('\n📋 Available users:');
    const users = await prisma.user.findMany({
      include: { profile: true },
      take: 10
    });
    for (const u of users) {
      console.log(`  - ${u.email} (${u.profile?.role || 'NO PROFILE'})`);
    }
    process.exit(1);
  }

  console.log('✅ User found:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name || 'Not set'}`);
  console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
  console.log(`   Created: ${user.createdAt}`);
  
  if (user.profile) {
    console.log(`\n👤 Profile:`);
    console.log(`   Role: ${user.profile.role}`);
    console.log(`   Phone: ${user.profile.phone || 'Not set'}`);
    console.log(`   Verification Status: ${user.profile.verificationStatus}`);
  } else {
    console.log(`\n⚠️  No profile found`);
  }

  if (user.accounts.length > 0) {
    console.log(`\n🔑 Accounts:`);
    for (const acc of user.accounts) {
      console.log(`   Provider: ${acc.provider}`);
    }
  }

  console.log(`\n\n💡 To reset password, use this email to login:`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Default Password: 123456 (if you haven't changed it)`);
  console.log(`\n   Or create a new OTP by accessing the login page.\n`);

  await prisma.$disconnect();
}

checkUser().catch(console.error);
