import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { verifyPassword } from 'better-auth/crypto';

const prisma = new PrismaClient();

async function checkAndFixAdmin() {
  const targetEmail = 'admin@helfer.in';
  const expectedPassword = 'admin123';
  const fallbackPassword = 'admin';

  console.log(`\n🔍 Checking admin account: ${targetEmail}\n`);

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: {
        accounts: true,
        profile: true,
      },
    });

    if (!user) {
      console.log('❌ Admin user not found. Creating new admin account...');
      await createAdminAccount(targetEmail, fallbackPassword);
      return;
    }

    console.log('✅ User exists:', user.name);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.profile?.role || 'NO PROFILE'}`);

    // Check if account with credentials exists
    const credentialAccount = user.accounts.find(acc => acc.providerId === 'credential');

    if (!credentialAccount || !credentialAccount.password) {
      console.log('⚠️  No credential account found. Setting up password...');
      const hashedPassword = await hashPassword(fallbackPassword);
      await prisma.account.create({
        data: {
          id: `credential-${user.id}`,
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Password set to: ${fallbackPassword}`);
    } else {
      // Check if password is admin123
      const isExpectedPassword = await verifyPassword({
        hash: credentialAccount.password,
        password: expectedPassword,
      });

      if (isExpectedPassword) {
        console.log('✅ Password is already: admin123');
      } else {
        console.log('⚠️  Password is NOT admin123. Updating to: admin');
        const hashedPassword = await hashPassword(fallbackPassword);
        await prisma.account.update({
          where: { id: credentialAccount.id },
          data: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
        });
        console.log('✅ Password updated to: admin');
      }
    }

    // Ensure user has ADMIN role
    if (!user.profile) {
      console.log('⚠️  No profile found. Creating ADMIN profile...');
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          role: 'ADMIN',
        },
      });
      console.log('✅ Admin profile created');
    } else if (user.profile.role !== 'ADMIN') {
      console.log('⚠️  User is not ADMIN. Updating role...');
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: { role: 'ADMIN' },
      });
      console.log('✅ Role updated to ADMIN');
    }

    console.log('\n🎉 Admin account is ready!');
    console.log(`   Email: ${targetEmail}`);
    console.log(`   Password: admin (if updated) or admin123 (if unchanged)`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createAdminAccount(email: string, password: string) {
  const crypto = await import('crypto');
  const userId = crypto.randomUUID();
  const now = new Date();

  // Create user
  const user = await prisma.user.create({
    data: {
      id: userId,
      email,
      name: 'Admin User',
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  });
  console.log('✅ User created');

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create credential account
  await prisma.account.create({
    data: {
      id: `credential-${userId}`,
      accountId: userId,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    },
  });
  console.log('✅ Credentials set');

  // Create admin profile
  await prisma.userProfile.create({
    data: {
      userId: userId,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin profile created');

  console.log(`\n🎉 Admin account created!`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

checkAndFixAdmin();
