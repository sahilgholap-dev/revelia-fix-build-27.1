import Purchases, {
  PurchasesOfferings,
  CustomerInfo,
  PurchasesPackage,
} from 'react-native-purchases';
import { SubscriptionTier } from './constants';

const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

export function initializeRevenueCat(): void {
  console.log('[RC] Initializing with key:', ANDROID_KEY ? ANDROID_KEY.substring(0, 10) + '...' : 'MISSING');
  if (!ANDROID_KEY) {
    console.warn('[RC] No Android key found - EXPO_PUBLIC_REVENUECAT_ANDROID_KEY not set');
    return;
  }
  try {
    Purchases.configure({ apiKey: ANDROID_KEY });
    console.log('[RevenueCat] Initialized');
  } catch (e) {
    console.warn('[RevenueCat] Init failed:', e);
  }
}

export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('[RevenueCat] User identified:', userId);
  } catch (e) {
    console.warn('[RevenueCat] identify failed:', e);
  }
}

export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn('[RevenueCat] logout failed:', e);
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (e) {
    console.warn('[RevenueCat] getOfferings failed:', e);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: any) {
    if (!e.userCancelled) {
      console.warn('[RevenueCat] purchase failed:', e);
    }
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (e) {
    console.warn('[RevenueCat] restore failed:', e);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (e) {
    console.warn('[RevenueCat] getCustomerInfo failed:', e);
    return null;
  }
}

export function addCustomerInfoListener(cb: (ci: CustomerInfo) => void): void {
  Purchases.addCustomerInfoUpdateListener(cb);
}

export function mapCustomerInfoToTier(customerInfo: CustomerInfo): SubscriptionTier {
  const entitlements = customerInfo.entitlements.active;
  if (entitlements['premium_plus']) return 'premium_plus';
  if (entitlements['premium']) return 'premium';
  return 'free';
}
