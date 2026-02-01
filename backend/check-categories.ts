import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCategories() {
  try {
    const count = await prisma.category.count();
    console.log('Total categories:', count);
    
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      select: { id: true, name: true }
    });
    console.log('Main categories:', categories);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
