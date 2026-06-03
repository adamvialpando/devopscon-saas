// checkout.js — cart + checkout page. Reads free_shipping, checkout_v2,
// payment_v2.
import { ready, flagsmith } from "./shared.js";

const PRODUCTS = {
  hoodie:   { name: "Flagsmith Hoodie", price: 65, emoji: "🧥" },
  tee:      { name: "Logo Tee",         price: 28, emoji: "👕" },
  cap:      { name: "Snapback Cap",     price: 24, emoji: "🧢" },
  stickers: { name: "Sticker Pack",     price: 6,  emoji: "✨" },
};
const CART = [
  { id: "hoodie",   qty: 1 },
  { id: "stickers", qty: 2 },
];
const SHIPPING = 8;

const els = {
  cartLines:   document.getElementById("cart-lines"),
  subtotal:    document.getElementById("subtotal"),
  shipping:    document.getElementById("shipping"),
  total:       document.getElementById("total"),
  checkoutV1:  document.getElementById("checkout-v1"),
  checkoutV2:  document.getElementById("checkout-v2"),
  payments:    document.getElementById("payments"),
  flagStatus:  document.getElementById("flag-status"),
  envMeta:     document.getElementById("env-meta"),
};

const money = (n) => `$${n.toFixed(2)}`;

function render() {
  const on = (k) => flagsmith.hasFeature(k);

  const subtotal = CART.reduce((s, l) => s + PRODUCTS[l.id].price * l.qty, 0);
  const freeShip = on("free_shipping");
  const ship = freeShip ? 0 : SHIPPING;

  els.cartLines.innerHTML = CART.map((l) => {
    const p = PRODUCTS[l.id];
    return `<li><span>${p.emoji} ${p.name} x${l.qty}</span><span>${money(p.price * l.qty)}</span></li>`;
  }).join("");
  els.subtotal.textContent = money(subtotal);
  els.shipping.innerHTML = freeShip
    ? `<span class="free">FREE</span> <s class="muted">${money(SHIPPING)}</s>`
    : money(ship);
  els.total.textContent = money(subtotal + ship);

  const v2 = on("checkout_v2");
  els.checkoutV1.hidden = v2;
  els.checkoutV2.hidden = !v2;

  els.payments.hidden = !on("payment_v2");

  els.flagStatus.textContent = "live";
  const env = (window.__FLAGSMITH_ENV_ID__ || "").slice(0, 8);
  els.envMeta.textContent = env
    ? `Flagsmith env ${env}... · flags poll every 5s`
    : "Flagsmith env not configured (edit public/config.js)";
}

document.addEventListener("flags:changed", render);
await ready;
render();
