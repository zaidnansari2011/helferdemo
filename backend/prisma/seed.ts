import { PrismaClient } from '@prisma/client';
import {
  categories,
  sellers,
  warehouses,
  productLocations,
  products,
  productVariants,
  // inventory, // Model doesn't exist yet
  deliveryZones,
  timeSlots,
  sampleCustomers,
  sampleAddresses
} from './seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...');
    await prisma.timeSlot.deleteMany();
    await prisma.deliveryZone.deleteMany();
    await prisma.productLocation.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.address.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.userProfile.deleteMany();

    // Seed Categories
    console.log('📂 Seeding categories...');
    for (const category of categories) {
      await prisma.category.create({
        data: {
          id: category.id,
          name: category.name,
          description: category.description,
          image: category.image,
          parentId: category.parentId,
          isActive: category.isActive,
          sortOrder: category.sortOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${categories.length} categories`);

    // Seed Users (Sellers & Customers)
    console.log('👥 Seeding users...');
    
    // Create sellers
    for (const seller of sellers) {
      await prisma.user.create({
        data: {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          emailVerified: true,
          phoneNumber: seller.phoneNumber,
          phoneNumberVerified: true,
          role: seller.role as any,
          businessCategories: seller.businessCategories,
          retailChannels: seller.retailChannels,
          socialChannels: seller.socialChannels,
          monthlySales: seller.monthlySales,
          designation: seller.designation,
          gstNumber: seller.gstNumber,
          legalBusinessName: seller.legalBusinessName,
          gstVerificationStatus: seller.gstVerificationStatus as any,
          brandName: seller.brandName,
          brandDescription: seller.brandDescription,
          brandWebsite: seller.brandWebsite,
          bankAccountNumber: seller.bankAccountNumber,
          ifscCode: seller.ifscCode,
          bankType: seller.bankType,
          bankVerificationStatus: seller.bankVerificationStatus as any,
          onboardingStep: seller.onboardingStep as any,
          verificationStatus: seller.verificationStatus as any,
          approvedAt: seller.approvedAt,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    // Create customers
    for (const customer of sampleCustomers) {
      await prisma.user.create({
        data: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          emailVerified: customer.emailVerified,
          phoneNumber: customer.phoneNumber,
          phoneNumberVerified: customer.phoneNumberVerified,
          role: customer.role as any,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${sellers.length} sellers and ${sampleCustomers.length} customers`);

    // Seed Addresses
    console.log('🏠 Seeding addresses...');
    for (const address of sampleAddresses) {
      await prisma.address.create({
        data: {
          id: address.id,
          userId: address.userId,
          title: address.title,
          fullAddress: address.fullAddress,
          landmark: address.landmark,
          pincode: address.pincode,
          latitude: address.latitude,
          longitude: address.longitude,
          isDefault: address.isDefault,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${sampleAddresses.length} addresses`);

    // Seed Warehouses
    console.log('🏭 Seeding warehouses...');
    for (const warehouse of warehouses) {
      await prisma.warehouse.create({
        data: {
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address,
          pincode: warehouse.pincode,
          latitude: warehouse.latitude,
          longitude: warehouse.longitude,
          sellerId: warehouse.sellerId,
          isActive: warehouse.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${warehouses.length} warehouses`);

    // Seed Product Locations
    console.log('📍 Seeding product locations...');
    for (const location of productLocations) {
      await prisma.productLocation.create({
        data: {
          id: location.id,
          warehouseId: location.warehouseId,
          locationCode: location.locationCode,
          aisle: location.aisle,
          section: location.section,
          shelf: location.shelf,
          row: location.row,
          column: location.column,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${productLocations.length} product locations`);

    // Seed Products
    console.log('📦 Seeding products...');
    for (const product of products) {
      await prisma.product.create({
        data: {
          id: product.id,
          name: product.name,
          description: product.description,
          brand: product.brand,
          sku: product.sku,
          basePrice: product.basePrice,
          images: product.images,
          categoryId: product.categoryId,
          sellerId: product.sellerId,
          isActive: product.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${products.length} products`);

    // Seed Product Variants
    console.log('🔄 Seeding product variants...');
    for (const variant of productVariants) {
      await prisma.productVariant.create({
        data: {
          id: variant.id,
          productId: variant.productId,
          name: variant.name,
          sku: variant.sku,
          price: variant.price,
          attributes: variant.attributes,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${productVariants.length} product variants`);

    // Seed Inventory - SKIPPED (model doesn't exist yet)
    // console.log('📊 Seeding inventory...');
    // for (const inv of inventory) {
    //   await prisma.inventory.create({
    //     data: {
    //       productVariantId: inv.productVariantId,
    //       locationId: inv.locationId,
    //       quantity: inv.quantity,
    //       reservedQuantity: 0,
    //       minStock: inv.minStock,
    //       maxStock: inv.maxStock,
    //       lastRestocked: new Date(),
    //       createdAt: new Date(),
    //       updatedAt: new Date()
    //     }
    //   });
    // }
    // console.log(`✅ Created ${inventory.length} inventory records`);

    // Seed Delivery Zones
    console.log('🚚 Seeding delivery zones...');
    for (const zone of deliveryZones) {
      await prisma.deliveryZone.create({
        data: {
          id: zone.id,
          name: zone.name,
          warehouseId: zone.warehouseId,
          pincode: zone.pincode,
          radius: zone.radius,
          deliveryFee: zone.deliveryFee,
          isActive: zone.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${deliveryZones.length} delivery zones`);

    // Seed Time Slots
    console.log('⏰ Seeding time slots...');
    for (const slot of timeSlots) {
      await prisma.timeSlot.create({
        data: {
          id: slot.id,
          zoneId: slot.zoneId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxOrders: slot.maxOrders,
          currentOrders: slot.currentOrders,
          isActive: slot.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${timeSlots.length} time slots`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   ${categories.length} categories (including subcategories)`);
    console.log(`   ${sellers.length} sellers with different verification statuses`);
    console.log(`   ${sampleCustomers.length} sample customers`);
    console.log(`   ${warehouses.length} warehouses across Mumbai`);
    console.log(`   ${productLocations.length} product locations with barcode format`);
    console.log(`   ${products.length} interior design hardware products`);
    console.log(`   ${productVariants.length} product variants (sizes, specifications)`);
    // console.log(`   ${inventory.length} inventory records with stock levels`);
    console.log(`   ${deliveryZones.length} delivery zones for Central Mumbai`);
    console.log(`   ${timeSlots.length} 30-minute delivery time slots`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 