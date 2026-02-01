import { router } from "../trpc";
import { userRouter } from "./user/user";
import { productsRouter } from "./products/products";
import { sellerRouter } from "./seller/seller";
import { inventoryRouter } from "./inventory/inventory";
import { warehouseRouter } from "./warehouse/warehouse";
import { inventoryProductsRouter } from "./inventory/products";
import { deliveryRouter } from "./delivery/delivery";
import { analyticsRouter } from "./analytics/analytics";
import { adminRouter } from "./admin/admin";
import { settingsRouter } from "./admin/settings";
import { procurementRouter } from "./procurement/procurement";

export const appRouter = router({
    user: userRouter,
    products: productsRouter,
    seller: sellerRouter,
    inventory: inventoryRouter,
    inventoryProducts: inventoryProductsRouter,
    warehouse: warehouseRouter,
    delivery: deliveryRouter,
    analytics: analyticsRouter,
    admin: adminRouter,
    settings: settingsRouter,
    procurement: procurementRouter,
  });

  export type AppRouter = typeof appRouter;