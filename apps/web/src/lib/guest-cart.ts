// ============================================================================
// Guest Cart Service - Client-side localStorage management
// ============================================================================

const GUEST_CART_KEY = "bhvr-guest-cart";
const GUEST_SESSION_ID_KEY = "bhvr-guest-session";

export interface GuestCartItem {
  productId: string;
  quantity: number;
  priceAtAdd: number;
}

export interface GuestCart {
  sessionId: string;
  items: GuestCartItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate a unique session ID for guest users
 */
function generateSessionId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create guest session ID
 */
export function getGuestSessionId(): string {
  let sessionId = localStorage.getItem(GUEST_SESSION_ID_KEY);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(GUEST_SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Get guest cart from localStorage
 */
export function getGuestCart(): GuestCart {
  const stored = localStorage.getItem(GUEST_CART_KEY);
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, create new cart
    }
  }
  
  // Create new cart
  const newCart: GuestCart = {
    sessionId: getGuestSessionId(),
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(newCart));
  return newCart;
}

/**
 * Save guest cart to localStorage
 */
function saveGuestCart(cart: GuestCart): void {
  cart.updatedAt = new Date().toISOString();
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
}

/**
 * Add item to guest cart
 */
export function addToGuestCart(productId: string, quantity: number, price: number): GuestCart {
  const cart = getGuestCart();
  
  // Check if item already exists
  const existingItem = cart.items.find((item) => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({
      productId,
      quantity,
      priceAtAdd: price,
    });
  }
  
  saveGuestCart(cart);
  return cart;
}

/**
 * Update cart item quantity
 */
export function updateGuestCartItem(productId: string, quantity: number): GuestCart {
  const cart = getGuestCart();
  const item = cart.items.find((item) => item.productId === productId);
  
  if (!item) {
    throw new Error("Item not found in cart");
  }
  
  if (quantity <= 0) {
    // Remove item if quantity is 0 or less
    cart.items = cart.items.filter((item) => item.productId !== productId);
  } else {
    item.quantity = quantity;
  }
  
  saveGuestCart(cart);
  return cart;
}

/**
 * Remove item from guest cart
 */
export function removeFromGuestCart(productId: string): GuestCart {
  const cart = getGuestCart();
  cart.items = cart.items.filter((item) => item.productId !== productId);
  saveGuestCart(cart);
  return cart;
}

/**
 * Clear guest cart
 */
export function clearGuestCart(): void {
  const sessionId = getGuestSessionId();
  const emptyCart: GuestCart = {
    sessionId,
    items: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(emptyCart));
}

/**
 * Get cart item count
 */
export function getGuestCartItemCount(): number {
  const cart = getGuestCart();
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Check if guest cart has items
 */
export function hasGuestCartItems(): boolean {
  const cart = getGuestCart();
  return cart.items.length > 0;
}

/**
 * Clear guest cart data (called after successful merge on login)
 */
export function clearGuestCartData(): void {
  localStorage.removeItem(GUEST_CART_KEY);
  localStorage.removeItem(GUEST_SESSION_ID_KEY);
}
