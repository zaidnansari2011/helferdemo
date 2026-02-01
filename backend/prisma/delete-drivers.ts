import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteDrivers() {
  try {
    console.log('🗑️  Deleting all delivery drivers and pickup helpers...');

    // First, find all delivery partner user IDs
    const deliveryUsers = await prisma.user.findMany({
      where: {
        profile: {
          role: {
            in: ['DELIVERY_DRIVER', 'PICKUP_HELPER']
          }
        }
      },
      select: { id: true, name: true, email: true }
    });

    if (deliveryUsers.length === 0) {
      console.log('ℹ️  No delivery partners found in the database');
      return;
    }

    console.log(`Found ${deliveryUsers.length} delivery partner(s):`);
    deliveryUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));

    const userIds = deliveryUsers.map(u => u.id);

    // Delete related records first (in correct order to avoid foreign key issues)
    console.log('\n🗑️  Deleting related records...');

    // Delete sessions
    await prisma.session.deleteMany({
      where: { userId: { in: userIds } }
    });

    // Delete accounts
    await prisma.account.deleteMany({
      where: { userId: { in: userIds } }
    });

    // Delete profiles (this will cascade delete most relationships)
    await prisma.userProfile.deleteMany({
      where: { userId: { in: userIds } }
    });

    // Finally delete users
    const result = await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });

    console.log(`✅ Successfully deleted ${result.count} delivery partner(s)`);
    
  } catch (error) {
    console.error('❌ Error deleting drivers:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDrivers();
