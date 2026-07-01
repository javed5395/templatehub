(function () {
  if (typeof window === "undefined") return;

  if (!window.Commerce) {
    window.Commerce = {};
  }

  const STORAGE_KEY = "lazy_cart_v1";

  let cartState = {
    buyerId: "",
    items: [],
    createdAt: null,
    updatedAt: null
  };

  function triggerEvent(eventName, detail = {}) {
    try {
      const event = new CustomEvent(eventName, {
        bubbles: true,
        detail: Object.assign({}, detail, { cart: getCartSnapshot() })
      });
      window.dispatchEvent(event);
    } catch (e) {}
  }

  function getCartSnapshot() {
    return {
      buyerId: cartState.buyerId,
      createdAt: cartState.createdAt,
      updatedAt: cartState.updatedAt,
      items: cartState.items.map(function (item) {
        return Object.assign({}, item);
      })
    };
  }

  function resetState() {
    const now = new Date().toISOString();
    cartState = {
      buyerId: "",
      items: [],
      createdAt: now,
      updatedAt: now
    };
  }

  function validateProductShape(product) {
    if (!product || typeof product !== "object") return false;
    const id = product.productId || product.id;
    return (
      typeof id === "string" &&
      id.trim() !== "" &&
      typeof product.title === "string" &&
      typeof product.sellerId === "string"
    );
  }

  function loadCart() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.items)) {
          cartState.items = parsed.items.filter(validateProductShape).map(function (item) {
            const id = item.productId || item.id;
            let price = item.price;
            if (price !== "free") {
              const numPrice = Number(price);
              price = isNaN(numPrice) ? 0 : numPrice;
            }
            return {
              productId: String(id).trim(),
              title: String(item.title).trim(),
              price: price,
              sellerId: String(item.sellerId).trim(),
              quantity: typeof item.quantity === "number" && item.quantity > 0 ? Math.floor(item.quantity) : 1
            };
          });
          cartState.buyerId = typeof parsed.buyerId === "string" ? parsed.buyerId : "";
          cartState.createdAt = parsed.createdAt || new Date().toISOString();
          cartState.updatedAt = parsed.updatedAt || new Date().toISOString();
          return;
        }
      }
    } catch (e) {}
    resetState();
  }

  function saveCart() {
    try {
      cartState.updatedAt = new Date().toISOString();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartState));
      triggerEvent("cart:updated");
    } catch (e) {}
  }

  async function syncBuyerId() {
    try {
      if (window.Commerce && window.Commerce.auth && typeof window.Commerce.auth.getCurrentUser === "function") {
        const user = await window.Commerce.auth.getCurrentUser();
        cartState.buyerId = user && user.uid ? String(user.uid) : "";
      } else {
        cartState.buyerId = "";
      }
    } catch (e) {
      cartState.buyerId = "";
    }
  }

  function addItem(product) {
    if (!validateProductShape(product)) {
      return false;
    }

    const rawId = product.productId || product.id;
    const productId = String(rawId).trim();

    let itemPrice = product.price;
    if (itemPrice !== "free") {
      const numPrice = Number(itemPrice);
      itemPrice = isNaN(numPrice) ? 0 : numPrice;
    }

    const existingItem = cartState.items.find(function (item) {
      return item.productId === productId;
    });

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
      cartState.items.push({
        productId: productId,
        title: String(product.title).trim(),
        price: itemPrice,
        sellerId: String(product.sellerId).trim(),
        quantity: 1
      });
    }

    saveCart();
    triggerEvent("cart:item-added", { productId: productId, product: product });
    return true;
  }

  function removeItem(productId) {
    if (typeof productId !== "string") return false;

    const cleanId = productId.trim();
    const initialLength = cartState.items.length;

    cartState.items = cartState.items.filter(function (item) {
      return item.productId !== cleanId;
    });

    if (cartState.items.length !== initialLength) {
      saveCart();
      triggerEvent("cart:item-removed", { productId: cleanId });
      return true;
    }
    return false;
  }

  function getItems() {
    return cartState.items.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function clearCart() {
    resetState();
    saveCart();
    triggerEvent("cart:cleared");
  }

  function getTotal() {
    return cartState.items.reduce(function (sum, item) {
      if (item.price === "free") {
        return sum;
      }
      return sum + (item.price * (item.quantity || 1));
    }, 0);
  }

  async function checkout(options) {
    const currentOptions = options || {};
    try {
      await syncBuyerId();

      if (!cartState.buyerId) {
        return { status: "login_required" };
      }

      if (cartState.items.length === 0) {
        return { status: "empty_cart" };
      }

      triggerEvent("cart:checkout-started", { options: currentOptions });

      const snapshotItems = getItems();

      // ONE combined payment for the whole basket — never one payment per item.
      // The single-payment opener lives in the commerce engine (Commerce.checkoutCart);
      // the cart only hands it the basket. The buyer pays once. On a confirmed
      // sale the engine fires "commerce:orderBridged", which clears the cart
      // (see the listener registered below) — so we do NOT clear it here.
      if (window.Commerce && typeof window.Commerce.checkoutCart === "function") {
        return await window.Commerce.checkoutCart(snapshotItems, currentOptions);
      }

      // Deliberate: if the engine's combined checkout isn't available we STOP.
      // We never fall back to looping a single-item checkout per product, because
      // that would charge the buyer once for every template in the basket.
      return { status: "engine_missing" };
    } catch (error) {
      return { status: "error", message: error.message };
    }
  }

  loadCart();

  // Clear the basket only after a purchase is actually confirmed by the
  // financial engine (fired once the combined payment goes through), not
  // optimistically at checkout time.
  try {
    window.addEventListener("commerce:orderBridged", function () { clearCart(); });
  } catch (e) {}

  window.Commerce.cart = {
    addItem: addItem,
    removeItem: removeItem,
    getItems: getItems,
    clearCart: clearCart,
    getTotal: getTotal,
    checkout: checkout
  };
})();