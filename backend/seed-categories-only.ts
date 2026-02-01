import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  // Main categories
  {
    id: "cat_tools",
    name: "Tools",
    description: "Hand tools and power tools for all construction needs",
    image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407",
    parentId: null,
    isActive: true,
    sortOrder: 1
  },
  {
    id: "cat_woodwork",
    name: "Wood work", 
    description: "Woodworking tools, screws, and accessories",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b",
    parentId: null,
    isActive: true,
    sortOrder: 2
  },
  {
    id: "cat_electrical",
    name: "Electrical",
    description: "Wiring, switches, bulbs, and electrical components",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4",
    parentId: null,
    isActive: true,
    sortOrder: 3
  },
  {
    id: "cat_security",
    name: "Security Systems",
    description: "Locks, CCTV, and security equipment",
    image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13",
    parentId: null,
    isActive: true,
    sortOrder: 4
  },
  {
    id: "cat_plumbing",
    name: "Plumbing",
    description: "Pipes, fittings, and plumbing accessories",
    image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189",
    parentId: null,
    isActive: true,
    sortOrder: 5
  },
  {
    id: "cat_safety",
    name: "Safety Equipment",
    description: "Safety gear and protective equipment",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837",
    parentId: null,
    isActive: true,
    sortOrder: 6
  },
  {
    id: "cat_painting",
    name: "Painting",
    description: "Paints, brushes, and painting supplies",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f",
    parentId: null,
    isActive: true,
    sortOrder: 7
  },

  // Subcategories
  {
    id: "sub_hand_tools",
    name: "Hand Tools",
    description: "Hammers, screwdrivers, pliers",
    parentId: "cat_tools",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "sub_power_tools", 
    name: "Power Tools",
    description: "Drills, saws, sanders",
    parentId: "cat_tools",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "sub_screws_fasteners",
    name: "Screws & Fasteners",
    description: "Wood screws, bolts, nuts",
    parentId: "cat_woodwork",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "sub_adhesives",
    name: "Adhesives",
    description: "Glues, fevicol, sealants",
    parentId: "cat_woodwork",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "sub_lighting",
    name: "Lighting",
    description: "LED bulbs, tube lights, fixtures",
    parentId: "cat_electrical",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "sub_switches_sockets",
    name: "Switches & Sockets",
    description: "Wall switches, power outlets",
    parentId: "cat_electrical",
    isActive: true,
    sortOrder: 2
  }
];

async function seedCategories() {
  console.log('🌱 Seeding categories...');
  
  try {
    // Clear existing categories
    await prisma.category.deleteMany();
    
    // Create categories
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
        }
      });
    }
    
    console.log(`✅ Created ${categories.length} categories!`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();
