// Seed data for interior design hardware store
export const categories = [
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

export const sellers = [
  {
    id: "seller_hardware_hub",
    name: "Rajesh Kumar",
    email: "rajesh@hardwarehub.com",
    phoneNumber: "+919876543210",
    role: "SELLER",
    businessCategories: JSON.stringify(["cat_tools", "cat_electrical"]),
    retailChannels: JSON.stringify({"online": "hardwarehub.com", "offline": "Hardware Hub Store"}),
    socialChannels: JSON.stringify({"instagram": "@hardwarehub", "facebook": "HardwareHub"}),
    monthlySales: "10L-25L",
    designation: "Owner",
    gstNumber: "27ABCDE1234F1Z5",
    legalBusinessName: "Hardware Hub Private Limited",
    gstVerificationStatus: "VERIFIED",
    brandName: "Hardware Hub",
    brandDescription: "Your trusted partner for quality tools and electrical supplies",
    brandWebsite: "https://hardwarehub.com",
    bankAccountNumber: "123456789012",
    ifscCode: "SBIN0001234",
    bankType: "Current",
    bankVerificationStatus: "VERIFIED",
    onboardingStep: "COMPLETED",
    verificationStatus: "VERIFIED",
    approvedAt: new Date("2024-01-15")
  },
  {
    id: "seller_wood_craft",
    name: "Priya Sharma", 
    email: "priya@woodcraft.in",
    phoneNumber: "+919876543211",
    role: "SELLER",
    businessCategories: JSON.stringify(["cat_woodwork", "cat_painting"]),
    retailChannels: JSON.stringify({"offline": "Wood Craft Store"}),
    socialChannels: JSON.stringify({"instagram": "@woodcraftindia"}),
    monthlySales: "5L-10L",
    designation: "Partner",
    gstNumber: "27FGHIJ5678K2Z9",
    legalBusinessName: "Wood Craft India",
    gstVerificationStatus: "VERIFIED",
    brandName: "Wood Craft",
    brandDescription: "Premium woodworking supplies and painting materials",
    bankAccountNumber: "987654321098",
    ifscCode: "HDFC0002345",
    bankType: "Current",
    bankVerificationStatus: "VERIFIED",
    onboardingStep: "COMPLETED",
    verificationStatus: "VERIFIED",
    approvedAt: new Date("2024-01-20")
  },
  {
    id: "seller_secure_solutions",
    name: "Amit Patel",
    email: "amit@securesolutions.co.in",
    phoneNumber: "+919876543212", 
    role: "SELLER",
    businessCategories: JSON.stringify(["cat_security", "cat_safety"]),
    retailChannels: JSON.stringify({"online": "securesolutions.co.in"}),
    monthlySales: "25L-50L",
    designation: "Managing Director",
    gstNumber: "27KLMNO9012P3Z4",
    legalBusinessName: "Secure Solutions LLP",
    gstVerificationStatus: "IN_PROGRESS",
    brandName: "Secure Solutions",
    brandDescription: "Advanced security and safety equipment provider",
    onboardingStep: "BANK_DETAILS",
    verificationStatus: "PENDING"
  }
];

export const warehouses = [
  {
    id: "warehouse_lo",
    name: "Lower Parel Warehouse",
    code: "LO",
    address: "Plot 123, Lower Parel Industrial Estate, Mumbai",
    pincode: "400013",
    latitude: 19.0176,
    longitude: 72.8336,
    sellerId: "seller_hardware_hub",
    isActive: true
  },
  {
    id: "warehouse_mh",
    name: "Malad Hub",
    code: "MH", 
    address: "Shop 45, Malad Industrial Area, Mumbai",
    pincode: "400064",
    latitude: 19.1868,
    longitude: 72.8479,
    sellerId: "seller_wood_craft",
    isActive: true
  },
  {
    id: "warehouse_an",
    name: "Andheri North Center",
    code: "AN",
    address: "Warehouse 7, Andheri MIDC, Mumbai",
    pincode: "400053", 
    latitude: 19.1197,
    longitude: 72.8697,
    sellerId: "seller_secure_solutions",
    isActive: true
  }
];

export const productLocations = [
  // Lower Parel Warehouse locations
  { id: "loc_lo_a10_008_01_a", warehouseId: "warehouse_lo", locationCode: "A10-008-01-A", aisle: "A", section: "10", shelf: "008", row: "01", column: "A" },
  { id: "loc_lo_a10_008_01_b", warehouseId: "warehouse_lo", locationCode: "A10-008-01-B", aisle: "A", section: "10", shelf: "008", row: "01", column: "B" },
  { id: "loc_lo_b12_009_02_c", warehouseId: "warehouse_lo", locationCode: "B12-009-02-C", aisle: "B", section: "12", shelf: "009", row: "02", column: "C" },
  { id: "loc_lo_c15_010_03_d", warehouseId: "warehouse_lo", locationCode: "C15-010-03-D", aisle: "C", section: "15", shelf: "010", row: "03", column: "D" },

  // Malad Hub locations
  { id: "loc_mh_a05_005_01_a", warehouseId: "warehouse_mh", locationCode: "A05-005-01-A", aisle: "A", section: "05", shelf: "005", row: "01", column: "A" },
  { id: "loc_mh_b08_006_02_b", warehouseId: "warehouse_mh", locationCode: "B08-006-02-B", aisle: "B", section: "08", shelf: "006", row: "02", column: "B" },
  { id: "loc_mh_c10_007_01_c", warehouseId: "warehouse_mh", locationCode: "C10-007-01-C", aisle: "C", section: "10", shelf: "007", row: "01", column: "C" },

  // Andheri North locations  
  { id: "loc_an_a02_003_01_a", warehouseId: "warehouse_an", locationCode: "A02-003-01-A", aisle: "A", section: "02", shelf: "003", row: "01", column: "A" },
  { id: "loc_an_b04_004_02_b", warehouseId: "warehouse_an", locationCode: "B04-004-02-B", aisle: "B", section: "04", shelf: "004", row: "02", column: "B" }
];

export const products = [
  // Tools
  {
    id: "prod_screwdriver_set",
    name: "Professional Screwdriver Set",
    description: "6-piece precision screwdriver set with magnetic tips. Includes Phillips and flathead drivers.",
    brand: "Stanley",
    sku: "STN-SD-001",
    basePrice: 450.00,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837",
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407"
    ]),
    categoryId: "sub_hand_tools",
    sellerId: "seller_hardware_hub",
    isActive: true
  },
  {
    id: "prod_drill_machine",
    name: "Cordless Drill Machine",
    description: "18V lithium-ion cordless drill with 2-speed gearbox and LED light.",
    brand: "Bosch",
    sku: "BSH-DRL-002", 
    basePrice: 3500.00,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407"
    ]),
    categoryId: "sub_power_tools",
    sellerId: "seller_hardware_hub",
    isActive: true
  },

  // Wood work
  {
    id: "prod_wood_screws",
    name: "Wood Screws",
    description: "Premium quality wood screws with zinc coating for durability.",
    brand: "Hettich",
    sku: "HET-WS-003",
    basePrice: 15.00,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b"
    ]),
    categoryId: "sub_screws_fasteners", 
    sellerId: "seller_wood_craft",
    isActive: true
  },
  {
    id: "prod_fevicol",
    name: "Fevicol Adhesive",
    description: "India's most trusted white adhesive for wood, paper, and fabric.",
    brand: "Pidilite",
    sku: "PID-FV-004",
    basePrice: 25.00,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b"
    ]),
    categoryId: "sub_adhesives",
    sellerId: "seller_wood_craft", 
    isActive: true
  },

  // Electrical
  {
    id: "prod_led_bulb",
    name: "LED Bulb",
    description: "Energy efficient LED bulb with long lifespan and bright illumination.",
    brand: "Philips",
    sku: "PHI-LED-005",
    basePrice: 120.00,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4"
    ]),
    categoryId: "sub_lighting",
    sellerId: "seller_hardware_hub",
    isActive: true
  },
  {
    id: "prod_wall_switch",
    name: "Wall Switch",
    description: "Modular wall switch with superior finish and smooth operation.",
    brand: "Anchor",
    sku: "ANC-SW-006",
    basePrice: 85.00,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4"
    ]),
    categoryId: "sub_switches_sockets",
    sellerId: "seller_hardware_hub",
    isActive: true
  },

  // Security
  {
    id: "prod_door_lock",
    name: "Digital Door Lock",
    description: "Smart digital door lock with fingerprint and password access.",
    brand: "Yale",
    sku: "YAL-DL-007",
    basePrice: 12500.00,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13"
    ]),
    categoryId: "cat_security",
    sellerId: "seller_secure_solutions",
    isActive: true
  }
];

export const productVariants = [
  // Screwdriver Set variants
  {
    id: "var_screwdriver_6pc",
    productId: "prod_screwdriver_set", 
    name: "6-piece Set",
    sku: "STN-SD-001-6PC",
    price: 450.00,
    attributes: JSON.stringify({"pieces": 6, "type": "mixed"})
  },
  {
    id: "var_screwdriver_12pc",
    productId: "prod_screwdriver_set",
    name: "12-piece Set", 
    sku: "STN-SD-001-12PC",
    price: 750.00,
    attributes: JSON.stringify({"pieces": 12, "type": "mixed"})
  },

  // Wood Screws variants
  {
    id: "var_screw_25mm",
    productId: "prod_wood_screws",
    name: "25mm x 4mm",
    sku: "HET-WS-003-25",
    price: 15.00,
    attributes: JSON.stringify({"length": "25mm", "diameter": "4mm", "material": "steel"})
  },
  {
    id: "var_screw_50mm",
    productId: "prod_wood_screws", 
    name: "50mm x 6mm",
    sku: "HET-WS-003-50",
    price: 25.00,
    attributes: JSON.stringify({"length": "50mm", "diameter": "6mm", "material": "steel"})
  },

  // Fevicol variants
  {
    id: "var_fevicol_100ml",
    productId: "prod_fevicol",
    name: "100ml Bottle",
    sku: "PID-FV-004-100",
    price: 25.00,
    attributes: JSON.stringify({"volume": "100ml", "type": "bottle"})
  },
  {
    id: "var_fevicol_500ml",
    productId: "prod_fevicol",
    name: "500ml Bottle", 
    sku: "PID-FV-004-500",
    price: 95.00,
    attributes: JSON.stringify({"volume": "500ml", "type": "bottle"})
  },
  {
    id: "var_fevicol_1kg",
    productId: "prod_fevicol",
    name: "1kg Container",
    sku: "PID-FV-004-1KG", 
    price: 180.00,
    attributes: JSON.stringify({"volume": "1kg", "type": "container"})
  },

  // LED Bulb variants
  {
    id: "var_led_9w_warm",
    productId: "prod_led_bulb",
    name: "9W Warm White",
    sku: "PHI-LED-005-9W-WW",
    price: 120.00,
    attributes: JSON.stringify({"wattage": "9W", "color": "warm_white", "base": "B22"})
  },
  {
    id: "var_led_12w_cool",
    productId: "prod_led_bulb",
    name: "12W Cool White",
    sku: "PHI-LED-005-12W-CW", 
    price: 160.00,
    attributes: JSON.stringify({"wattage": "12W", "color": "cool_white", "base": "B22"})
  },
  {
    id: "var_led_15w_daylight",
    productId: "prod_led_bulb",
    name: "15W Daylight",
    sku: "PHI-LED-005-15W-DL",
    price: 200.00,
    attributes: JSON.stringify({"wattage": "15W", "color": "daylight", "base": "B22"})
  }
];

export const inventory = [
  // Hardware Hub (LO warehouse) inventory
  { productVariantId: "var_screwdriver_6pc", locationId: "loc_lo_a10_008_01_a", quantity: 50, minStock: 10, maxStock: 100 },
  { productVariantId: "var_screwdriver_12pc", locationId: "loc_lo_a10_008_01_b", quantity: 25, minStock: 5, maxStock: 50 },
  { productVariantId: "var_led_9w_warm", locationId: "loc_lo_b12_009_02_c", quantity: 200, minStock: 50, maxStock: 500 },
  { productVariantId: "var_led_12w_cool", locationId: "loc_lo_b12_009_02_c", quantity: 150, minStock: 30, maxStock: 300 },
  { productVariantId: "var_led_15w_daylight", locationId: "loc_lo_c15_010_03_d", quantity: 100, minStock: 25, maxStock: 200 },

  // Wood Craft (MH warehouse) inventory  
  { productVariantId: "var_screw_25mm", locationId: "loc_mh_a05_005_01_a", quantity: 1000, minStock: 200, maxStock: 2000 },
  { productVariantId: "var_screw_50mm", locationId: "loc_mh_a05_005_01_a", quantity: 800, minStock: 150, maxStock: 1500 },
  { productVariantId: "var_fevicol_100ml", locationId: "loc_mh_b08_006_02_b", quantity: 300, minStock: 50, maxStock: 500 },
  { productVariantId: "var_fevicol_500ml", locationId: "loc_mh_c10_007_01_c", quantity: 150, minStock: 30, maxStock: 300 },
  { productVariantId: "var_fevicol_1kg", locationId: "loc_mh_c10_007_01_c", quantity: 75, minStock: 15, maxStock: 150 }
];

export const deliveryZones = [
  {
    id: "zone_lower_parel",
    name: "Lower Parel Zone",
    warehouseId: "warehouse_lo",
    pincode: "400013",
    radius: 5.0,
    deliveryFee: 25.00,
    isActive: true
  },
  {
    id: "zone_worli",
    name: "Worli Zone", 
    warehouseId: "warehouse_lo",
    pincode: "400018",
    radius: 4.5,
    deliveryFee: 30.00,
    isActive: true
  },
  {
    id: "zone_malad",
    name: "Malad Zone",
    warehouseId: "warehouse_mh", 
    pincode: "400064",
    radius: 5.0,
    deliveryFee: 25.00,
    isActive: true
  },
  {
    id: "zone_andheri",
    name: "Andheri Zone",
    warehouseId: "warehouse_an",
    pincode: "400053",
    radius: 5.0,
    deliveryFee: 25.00,
    isActive: true
  }
];

export const timeSlots = [
  // Today's slots for Lower Parel Zone
  {
    id: "slot_lp_09_00",
    zoneId: "zone_lower_parel",
    date: new Date(),
    startTime: "09:00",
    endTime: "09:30", 
    maxOrders: 10,
    currentOrders: 2,
    isActive: true
  },
  {
    id: "slot_lp_09_30",
    zoneId: "zone_lower_parel",
    date: new Date(),
    startTime: "09:30",
    endTime: "10:00",
    maxOrders: 10,
    currentOrders: 5,
    isActive: true
  },
  {
    id: "slot_lp_10_00", 
    zoneId: "zone_lower_parel",
    date: new Date(),
    startTime: "10:00",
    endTime: "10:30",
    maxOrders: 10,
    currentOrders: 8,
    isActive: true
  },

  // Malad Zone slots
  {
    id: "slot_ml_11_00",
    zoneId: "zone_malad",
    date: new Date(),
    startTime: "11:00", 
    endTime: "11:30",
    maxOrders: 8,
    currentOrders: 1,
    isActive: true
  },
  {
    id: "slot_ml_14_00",
    zoneId: "zone_malad",
    date: new Date(),
    startTime: "14:00",
    endTime: "14:30",
    maxOrders: 8,
    currentOrders: 3,
    isActive: true
  }
];

export const sampleCustomers = [
  {
    id: "customer_arjun",
    name: "Arjun Mehta",
    email: "arjun.mehta@gmail.com", 
    phoneNumber: "+919876543220",
    role: "CUSTOMER",
    emailVerified: true,
    phoneNumberVerified: true
  },
  {
    id: "customer_sneha",
    name: "Sneha Patil",
    email: "sneha.patil@yahoo.com",
    phoneNumber: "+919876543221", 
    role: "CUSTOMER",
    emailVerified: true,
    phoneNumberVerified: true
  }
];

export const sampleAddresses = [
  {
    id: "addr_arjun_home",
    userId: "customer_arjun",
    title: "Home",
    fullAddress: "Flat 301, Sunrise Apartments, Linking Road, Bandra West",
    landmark: "Near Bandra Station",
    pincode: "400050",
    latitude: 19.0596,
    longitude: 72.8295,
    isDefault: true
  },
  {
    id: "addr_sneha_office",
    userId: "customer_sneha", 
    title: "Office",
    fullAddress: "Office 205, Business Tower, Lower Parel",
    landmark: "Opposite High Street Phoenix",
    pincode: "400013",
    latitude: 19.0144,
    longitude: 72.8333,
    isDefault: true
  }
]; 