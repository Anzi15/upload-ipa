import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";

export const REVENUECAT_IOS_API_KEY = "test_yltjiMLKoQxtSfjucmvXPPRiWwa";

let isInitialized = false;

/**
 * Initializes RevenueCat SDK on iOS platform only.
 * Leaves Web and Android untouched.
 */
export async function initRevenueCat(appUserID?: string) {
  if (Capacitor.getPlatform() !== "ios") {
    return false;
  }

  try {
    if (!isInitialized) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: REVENUECAT_IOS_API_KEY,
        appUserID: appUserID || undefined,
      });
      isInitialized = true;
    } else if (appUserID) {
      await Purchases.logIn({ appUserID });
    }
    return true;
  } catch (error) {
    console.error("RevenueCat initialization failed:", error);
    return false;
  }
}

/**
 * Fetches current offerings from RevenueCat
 */
export async function getRevenueCatOfferings() {
  if (Capacitor.getPlatform() !== "ios") return null;

  try {
    await initRevenueCat();
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error("Failed to fetch RevenueCat offerings:", error);
    return null;
  }
}

/**
 * Purchases a RevenueCat Package (e.g. bundle package or specific offering package)
 */
export async function purchaseRevenueCatPackage(packageToPurchase: any) {
  if (Capacitor.getPlatform() !== "ios") {
    throw new Error("Native IAP is only supported on iOS.");
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: packageToPurchase,
    });
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("User cancelled purchase.");
      return null;
    }
    throw error;
  }
}

/**
 * Purchases a product by ID or StoreProduct object
 */
export async function purchaseRevenueCatProduct(productId: string) {
  if (Capacitor.getPlatform() !== "ios") {
    throw new Error("Native IAP is only supported on iOS.");
  }

  try {
    // Attempt to get product from RevenueCat offerings first
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      const pkg = offerings.current.availablePackages.find(
        (p: any) => p.product.identifier === productId
      );
      if (pkg) {
        return await purchaseRevenueCatPackage(pkg);
      }
    }

    // Fallback: Purchase store product directly
    const products = await Purchases.getProducts({
      productIdentifiers: [productId],
    });
    if (products.products && products.products.length > 0) {
      const storeProduct = products.products[0];
      const { customerInfo } = await Purchases.purchaseStoreProduct({
        product: storeProduct,
      });
      return customerInfo;
    }

    throw new Error(`Product ${productId} not found in store or offerings.`);
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("User cancelled purchase.");
      return null;
    }
    throw error;
  }
}

/**
 * Restores purchases for the current user (required by Apple App Store)
 */
export async function restoreRevenueCatPurchases() {
  if (Capacitor.getPlatform() !== "ios") {
    throw new Error("Restore purchases is only available on iOS.");
  }

  try {
    await initRevenueCat();
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("Failed to restore RevenueCat purchases:", error);
    throw error;
  }
}

/**
 * Checks if a specific entitlement is active on customerInfo
 */
export function hasEntitlement(customerInfo: any, entitlementId: string): boolean {
  if (!customerInfo || !customerInfo.entitlements || !customerInfo.entitlements.active) {
    return false;
  }
  return !!customerInfo.entitlements.active[entitlementId];
}
