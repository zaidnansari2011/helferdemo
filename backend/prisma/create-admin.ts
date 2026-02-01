import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.argv[2] || 'admin@helfer.in';
  const password = process.argv[3] || 'admin123';
  const name = process.argv[4] || 'Admin User';

  console.log(`Creating admin account: ${email}`);

  try {
    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });
    const now = new Date();
    const userId = user?.id || crypto.randomUUID();

    if (!user) {
      // Create user
      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          name,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      });
      console.log('✅ User created');
    } else {
      console.log('ℹ️  User already exists');
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create or update account with password (Better Auth credential account)
    await prisma.account.upsert({
      where: {
        id: `credential-${user.id}`,
      },
      create: {
        id: `credential-${user.id}`,
        accountId: user.id,
        providerId: 'credential',
        userId: user.id,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        password: hashedPassword,
        updatedAt: now,
      },
    });
    console.log('✅ Account credentials set');

    // Create or update UserProfile with ADMIN role
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        role: 'ADMIN',
      },
      update: {
        role: 'ADMIN',
      },
    });
    console.log('✅ UserProfile set with ADMIN role');

    console.log('\n🎉 Admin account ready!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

  } catch (error: any) {
    console.error('❌ Error creating admin:', error);
    throw error;
  }
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
