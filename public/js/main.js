// js/main.js - Shared cart logic

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('aw_cart') || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('aw_cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().length;
  const el = document.getElementById('cart-count');
  if (el) el.textContent = count;
}

function addToCart(id, title, price_cents, weight_oz) {
  const cart = getCart();
  if (cart.find(i => i.id === id)) {
    alert('Already in cart');
    return;
  }
  cart.push({ id, title, price_cents, weight_oz });
  saveCart(cart);
  alert('Added to cart!');
}

function removeFromCart(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  if (typeof renderCart === 'function') renderCart();
}

// Auto-update count on load
document.addEventListener('DOMContentLoaded', updateCartCount);
