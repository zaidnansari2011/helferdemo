import { PrismaClient } from '@prisma/client';
import {
  categories,
  sellers,
  warehouses,
  products,
  productVariants,
  deliveryZones,
  timeSlots,
  sampleCustomers,
  sampleAddresses
} from './seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (v2 - compatible with new schema)...');

  try {
    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...');
    
    // Clear delivery/order related
    await prisma.earning.deleteMany();
    await prisma.deliveryTracking.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.timeSlot.deleteMany();
    await prisma.deliveryZone.deleteMany();
    
    // Clear product locations and warehouse hierarchy
    await prisma.productLocation.deleteMany();
    await prisma.warehouseBin.deleteMany();
    await prisma.warehouseShelf.deleteMany();
    await prisma.warehouseRack.deleteMany();
    await prisma.warehouseArea.deleteMany();
    await prisma.warehouseFloorPlan.deleteMany();
    
    // Clear products
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    
    // Clear warehouse and shipping
    await prisma.warehouse.deleteMany();
    await prisma.shippingLocation.deleteMany();
    
    // Clear addresses
    await prisma.address.deleteMany();
    
    // Clear categories
    await prisma.category.deleteMany();
    
    // Clear user profiles and users
    await prisma.userProfile.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

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

    // Seed Users and UserProfiles (Sellers & Customers)
    console.log('👥 Seeding users and profiles...');
    
    // Create sellers with profiles
    for (const seller of sellers) {
      // Create the User first
      await prisma.user.create({
        data: {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          emailVerified: true,
          phoneNumber: seller.phoneNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Create the UserProfile separately
      await prisma.userProfile.create({
        data: {
          userId: seller.id,
          role: 'SELLER',
          businessCategories: seller.businessCategories,
          retailChannels: seller.retailChannels,
          socialChannels: seller.socialChannels,
          monthlySales: seller.monthlySales,
          designation: seller.designation,
          gstNumber: seller.gstNumber,
          legalBusinessName: seller.legalBusinessName,
          gstVerificationStatus: (seller.gstVerificationStatus || 'PENDING') as any,
          brandName: seller.brandName,
          brandDescription: seller.brandDescription,
          brandWebsite: seller.brandWebsite,
          bankAccountNumber: seller.bankAccountNumber,
          ifscCode: seller.ifscCode,
          bankType: seller.bankType,
          bankVerificationStatus: (seller.bankVerificationStatus || 'PENDING') as any,
          onboardingStep: (seller.onboardingStep || 'BUSINESS_DETAILS') as any,
          verificationStatus: (seller.verificationStatus || 'PENDING') as any,
          approvedAt: seller.approvedAt,
        }
      });
    }
    
    // Create customers with profiles
    for (const customer of sampleCustomers) {
      // Create the User first
      await prisma.user.create({
        data: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          emailVerified: customer.emailVerified,
          phoneNumber: customer.phoneNumber,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Create the UserProfile
      await prisma.userProfile.create({
        data: {
          userId: customer.id,
          role: 'CUSTOMER',
        }
      });
    }
    console.log(`✅ Created ${sellers.length} sellers and ${sampleCustomers.length} customers with profiles`);

    // Seed Shipping Locations (required for warehouses)
    console.log('📦 Seeding shipping locations...');
    const shippingLocations: { id: string; sellerId: string }[] = [];
    
    for (const warehouse of warehouses) {
      const shippingLocationId = `ship_${warehouse.id}`;
      
      // Get seller profile
      const sellerProfile = await prisma.userProfile.findFirst({
        where: { userId: warehouse.sellerId }
      });
      
      if (!sellerProfile) {
        console.log(`⚠️ Seller profile not found for ${warehouse.sellerId}, skipping shipping location`);
        continue;
      }
      
      await prisma.shippingLocation.create({
        data: {
          id: shippingLocationId,
          sellerId: sellerProfile.id,
          businessName: warehouse.name,
          gstNumber: `27GST${warehouse.code}12345`,
          address: warehouse.address,
          pincode: warehouse.pincode,
          state: 'Maharashtra',
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      shippingLocations.push({ id: shippingLocationId, sellerId: sellerProfile.id });
    }
    console.log(`✅ Created ${shippingLocations.length} shipping locations`);

    // Seed Warehouses with Shipping Locations
    console.log('🏭 Seeding warehouses...');
    const warehouseMap: Map<string, string> = new Map(); // old ID -> new profile seller ID
    
    for (let i = 0; i < warehouses.length; i++) {
      const warehouse = warehouses[i];
      const shippingLocation = shippingLocations[i];
      
      if (!shippingLocation) {
        console.log(`⚠️ No shipping location for warehouse ${warehouse.id}, skipping`);
        continue;
      }
      
      await prisma.warehouse.create({
        data: {
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address,
          pincode: warehouse.pincode,
          latitude: warehouse.latitude,
          longitude: warehouse.longitude,
          sellerId: shippingLocation.sellerId,
          shippingLocationId: shippingLocation.id,
          isActive: warehouse.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      warehouseMap.set(warehouse.id, shippingLocation.sellerId);
    }
    console.log(`✅ Created ${warehouses.length} warehouses`);

    // Create warehouse hierarchy (FloorPlan -> Area -> Rack -> Shelf -> Bin)
    console.log('🏗️ Creating warehouse storage hierarchy...');
    const binMap: Map<string, string> = new Map(); // locationCode -> binId
    
    for (const warehouse of warehouses) {
      // Create floor plan
      const floorPlan = await prisma.warehouseFloorPlan.create({
        data: {
          warehouseId: warehouse.id,
          floor: 'L0',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Create areas A, B, C
      const areaMap: Map<string, string> = new Map();
      for (const areaCode of ['A', 'B', 'C']) {
        const area = await prisma.warehouseArea.create({
          data: {
            floorPlanId: floorPlan.id,
            code: areaCode,
            name: `Area ${areaCode}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        areaMap.set(areaCode, area.id);
      }
      
      // Create racks and shelves for each area
      const areaEntries = Array.from(areaMap.entries());
      for (const [areaCode, areaId] of areaEntries) {
        for (let rackNum = 1; rackNum <= 5; rackNum++) {
          const rack = await prisma.warehouseRack.create({
            data: {
              areaId: areaId,
              number: rackNum.toString().padStart(2, '0'),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          // Create 4 shelf levels per rack
          for (let level = 1; level <= 4; level++) {
            const shelf = await prisma.warehouseShelf.create({
              data: {
                rackId: rack.id,
                level: level,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            // Create bins A, B, C, D per shelf
            for (const binCode of ['A', 'B', 'C', 'D']) {
              const bin = await prisma.warehouseBin.create({
                data: {
                  shelfId: shelf.id,
                  code: binCode,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              });
              
              // Create locationCode mapping: A01-01-A format (Area-Rack-Level-Bin)
              const locationCode = `${areaCode}${rackNum.toString().padStart(2, '0')}-${level.toString().padStart(2, '0')}-${binCode}`;
              binMap.set(`${warehouse.id}_${locationCode}`, bin.id);
            }
          }
        }
      }
    }
    console.log(`✅ Created warehouse hierarchy with ${binMap.size} bins`);

    // Seed Products
    console.log('📦 Seeding products...');
    
    for (const product of products) {
      // Get seller profile ID
      const sellerProfile = await prisma.userProfile.findFirst({
        where: { userId: product.sellerId }
      });
      
      if (!sellerProfile) {
        console.log(`⚠️ Seller profile not found for ${product.sellerId}, skipping product ${product.name}`);
        continue;
      }
      
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
          sellerId: sellerProfile.id,
          isActive: product.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${products.length} products`);

    // Seed Product Variants with barcodes
    console.log('🔄 Seeding product variants...');
    for (const variant of productVariants) {
      // Generate a barcode for the variant
      const barcode = `BC${variant.sku.replace(/-/g, '')}`;
      
      await prisma.productVariant.create({
        data: {
          id: variant.id,
          productId: variant.productId,
          name: variant.name,
          sku: variant.sku,
          barcode: barcode,
          price: variant.price,
          attributes: variant.attributes,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    console.log(`✅ Created ${productVariants.length} product variants`);

    // Seed Product Locations (assign variants to bins with quantity)
    console.log('📍 Seeding product locations...');
    let locationCount = 0;
    
    // Assign variants to bins in their seller's warehouse
    const variantWarehouseMap: Record<string, string> = {
      'seller_hardware_hub': 'warehouse_lo',
      'seller_wood_craft': 'warehouse_mh',
      'seller_secure_solutions': 'warehouse_an'
    };
    
    for (const variant of productVariants) {
      // Find which product this variant belongs to
      const product = products.find(p => p.id === variant.productId);
      if (!product) continue;
      
      // Find which warehouse this seller uses
      const warehouseId = variantWarehouseMap[product.sellerId];
      if (!warehouseId) continue;
      
      // Get a random bin from this warehouse
      const binKeys = Array.from(binMap.keys()).filter(k => k.startsWith(`${warehouseId}_`));
      if (binKeys.length === 0) continue;
      
      const randomBinKey = binKeys[Math.floor(Math.random() * binKeys.length)];
      const binId = binMap.get(randomBinKey);
      if (!binId) continue;
      
      // Create product location with quantity
      await prisma.productLocation.create({
        data: {
          productVariantId: variant.id,
          binId: binId,
          quantity: Math.floor(Math.random() * 100) + 10, // Random quantity 10-110
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      locationCount++;
    }
    console.log(`✅ Created ${locationCount} product locations`);

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

    // Seed Addresses (need to use UserProfile ID, not User ID)
    console.log('🏠 Seeding addresses...');
    for (const address of sampleAddresses) {
      // Get user profile for this address
      const userProfile = await prisma.userProfile.findFirst({
        where: { userId: address.userId }
      });
      
      if (!userProfile) {
        console.log(`⚠️ User profile not found for ${address.userId}, skipping address`);
        continue;
      }
      
      await prisma.address.create({
        data: {
          id: address.id,
          userId: userProfile.id, // Use profile ID, not user ID
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

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('Summary:');
    console.log(`  - Categories: ${categories.length}`);
    console.log(`  - Sellers: ${sellers.length}`);
    console.log(`  - Customers: ${sampleCustomers.length}`);
    console.log(`  - Warehouses: ${warehouses.length}`);
    console.log(`  - Products: ${products.length}`);
    console.log(`  - Variants: ${productVariants.length}`);
    console.log(`  - Product Locations: ${locationCount}`);
    console.log(`  - Delivery Zones: ${deliveryZones.length}`);
    console.log(`  - Time Slots: ${timeSlots.length}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
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
