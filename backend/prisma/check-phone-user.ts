import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPhoneUser() {
  const phoneNumber = process.argv[2] || '87845768394';
  
  console.log(`\n🔍 Checking users with phone: ${phoneNumber}\n`);

  // Check by phone number
  const userByPhone = await prisma.user.findUnique({
    where: { phoneNumber: phoneNumber },
    include: { 
      profile: true,
      accounts: true 
    }
  });

  // Also check variations
  const userByPhoneWithPlus = await prisma.user.findUnique({
    where: { phoneNumber: `+91${phoneNumber}` },
    include: { 
      profile: true,
      accounts: true 
    }
  });

  // Check by temp email format
  const userByEmail = await prisma.user.findUnique({
    where: { email: `${phoneNumber}@temp.blinkit.com` },
    include: { 
      profile: true,
      accounts: true 
    }
  });

  console.log('📱 User by phone number:', phoneNumber);
  if (userByPhone) {
    console.log(`   ✅ Found: ${userByPhone.name} (${userByPhone.email})`);
    console.log(`   ID: ${userByPhone.id}`);
    console.log(`   Role: ${userByPhone.profile?.role || 'NO PROFILE'}`);
  } else {
    console.log('   ❌ Not found');
  }

  console.log('\n📱 User by phone with +91:', `+91${phoneNumber}`);
  if (userByPhoneWithPlus) {
    console.log(`   ✅ Found: ${userByPhoneWithPlus.name} (${userByPhoneWithPlus.email})`);
    console.log(`   ID: ${userByPhoneWithPlus.id}`);
    console.log(`   Role: ${userByPhoneWithPlus.profile?.role || 'NO PROFILE'}`);
  } else {
    console.log('   ❌ Not found');
  }

  console.log('\n📧 User by temp email:', `${phoneNumber}@temp.blinkit.com`);
  if (userByEmail) {
    console.log(`   ✅ Found: ${userByEmail.name}`);
    console.log(`   Phone: ${userByEmail.phoneNumber}`);
    console.log(`   ID: ${userByEmail.id}`);
    console.log(`   Role: ${userByEmail.profile?.role || 'NO PROFILE'}`);
  } else {
    console.log('   ❌ Not found');
  }

  // List all users with phone numbers
  console.log('\n📋 All users with phone numbers:');
  const allUsersWithPhone = await prisma.user.findMany({
    where: {
      phoneNumber: { not: null }
    },
    include: { profile: true },
    take: 20
  });

  allUsersWithPhone.forEach(u => {
    console.log(`   - ${u.phoneNumber} → ${u.email} (${u.name}) [${u.profile?.role || 'NO PROFILE'}]`);
  });

  await prisma.$disconnect();
}

checkPhoneUser();
