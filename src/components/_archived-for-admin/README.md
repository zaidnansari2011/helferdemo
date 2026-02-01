# Archived Warehouse Components for Admin App

## Purpose
These components were moved from the seller dashboard and are preserved for integration into the admin panel.

## Components Included
1. **CreateWarehouseModal.tsx** - Create new warehouses with location, shipping details
2. **WarehouseDetailsModal.tsx** - Manage 5-level warehouse hierarchy (Floor > Area > Rack > Shelf > Bin)
3. **HierarchyCreateModal.tsx** - Create sub-entities within warehouse hierarchy

## Integration Notes for Admin App

### Backend Integration
- The warehouse tRPC router (`backend/server/routers/warehouse.ts`) remains unchanged
- Admin access can be added by modifying the seller ID resolution logic
- All warehouse procedures are fully functional and tested

### Component Reusability
- Components can be copied as-is to admin-app
- Update import paths from `@/components/warehouse/*` to match admin app structure
- tRPC calls require passing seller ID as parameter when admin views seller's warehouse

### Usage Example in Admin
```tsx
// In admin app, when viewing seller's warehouses:
<CreateWarehouseModal sellerId={selectedSeller.id} />
```

### Database Schema
Warehouse hierarchy structure (no changes needed):
- Warehouse (root)
  - FloorPlan
    - Area
      - Rack
        - Shelf
          - Bin (leaf node with location code & barcode)

### Features Preserved
✅ Full 5-level hierarchy management
✅ Location code generation (e.g., WH01-F01-A01-R01-S01-B01)
✅ Barcode generation for bins
✅ Map-based location picker
✅ Shipping location integration
✅ Expandable tree view UI

## Migration Checklist
- [ ] Copy warehouse folder to admin-app/src/components/
- [ ] Update import paths
- [ ] Add seller ID parameter to all tRPC calls
- [ ] Create admin warehouse management page
- [ ] Test hierarchy creation and location codes
- [ ] Verify barcode generation works

## Last Updated
February 1, 2026
