# Backend - Interior Design Hardware Store

## Database Setup & Seeding

This backend contains a comprehensive Prisma schema for a 10-minute delivery hardware store with sample seed data.

### Quick Start

1. **Generate Prisma Client:**
   ```bash
   bun run db:generate
   ```

2. **Seed Database with Sample Data:**
   ```bash
   bun run db:seed
   ```

3. **Reset Database (clear + reseed):**
   ```bash
   bun run db:reset
   ```

### What's Included in Seed Data

The seed includes realistic interior design hardware data:

#### **🏢 Business Entities**
- **3 Sellers** with different verification statuses:
  - Hardware Hub (verified, selling tools & electrical)
  - Wood Craft (verified, selling woodwork & painting supplies)  
  - Secure Solutions (pending verification, security systems)

#### **📦 Product Catalog**
- **7 Main Categories**: Tools, Wood work, Electrical, Security, Plumbing, Safety, Painting
- **6 Subcategories**: Hand Tools, Power Tools, Screws & Fasteners, etc.
- **7 Products**: Screwdriver sets, drill machines, wood screws, Fevicol, LED bulbs, wall switches, digital door locks
- **11 Product Variants**: Different sizes, wattages, and specifications

#### **🏭 Warehouse & Inventory**
- **3 Warehouses** across Mumbai (Lower Parel, Malad, Andheri)
- **9 Product Locations** with barcode format (LO-A10-008-01-B)
- **10 Inventory Records** with realistic stock levels

#### **🚚 Delivery System**
- **4 Delivery Zones** covering Central Mumbai
- **5 Time Slots** for 30-minute delivery windows
- **2 Sample Customers** with addresses

### Sample Data Examples

**Sellers:**
- Rajesh Kumar (Hardware Hub) - Verified seller with tools & electrical supplies
- Priya Sharma (Wood Craft) - Verified seller with woodworking materials
- Amit Patel (Secure Solutions) - Pending verification, security equipment

**Products:**
- Stanley Screwdriver Set (6pc/12pc variants)
- Bosch Cordless Drill Machine
- Hettich Wood Screws (25mm/50mm variants)
- Pidilite Fevicol (100ml/500ml/1kg variants)
- Philips LED Bulbs (9W/12W/15W variants)
- Digital Door Locks

**Locations:**
- `LO-A10-008-01-B` = Lower Parel warehouse, Aisle A, Section 10, Shelf 008, Row 01, Column B

### Database Schema Features

✅ **Complete seller onboarding** (business details, GST, bank verification)  
✅ **Hierarchical product categories** with variants  
✅ **Warehouse location tracking** with barcode system  
✅ **Inventory management** per location  
✅ **30-minute delivery slots** with zone-based pricing  
✅ **Real-time GPS tracking** for delivery  
✅ **Earnings & payout system** for drivers/helpers  
✅ **Soft deletes** for data preservation  

### Running the Application

```bash
# Start the backend server
bun run start
```

The server will run on the default port with hot reload enabled. 