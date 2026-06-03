// home.js — catalog page logic. Reads sale_banner, sale_banner_text,
// featured_product, show_recommendations. dark_mode is handled in shared.js.
import { ready, flagsmith } from "./shared.js";

const PRODUCTS = [
  { id: "hoodie",   name: "Flagsmith Hoodie", price: 65, emoji: "🧥" },
  { id: "tee",      name: "Logo Tee",         price: 28, emoji: "👕" },
  { id: "cap",      name: "Snapback Cap",     price: 24, emoji: "🧢" },
  { id: "stickers", name: "Sticker Pack",     price: 6,  emoji: "✨" },
];

const RELATED = [
  { id: "tee",      name: "Logo Tee",      price: 28, emoji: "👕" },
  { id: "stickers", name: "Sticker Pack",  price: 6,  emoji: "✨" },
  { id: "cap",      name: "Snapback Cap",  price: 24, emoji: "🧢" },
];

const els = {
  saleBanner:    document.getElementById("sale-banner"),
  catalog:       document.getElementById("catalog"),
  recHead:       document.getElementById("rec-head"),
  recs:          document.getElementById("recommendations"),
  flagStatus:    document.getElementById("flag-status"),
  envMeta:       document.getElementById("env-meta"),
};

const money = (n) => `$${n.toFixed(2)}`;

function render() {
  const on  = (k)     => flagsmith.hasFeature(k);
  const val = (k, fb) => flagsmith.getValue(k, { fallback: fb }) ?? fb;

  // Sale banner
  const bannerText = val("sale_banner_text", "");
  if (on("sale_banner") && bannerText) {
    els.saleBanner.textContent = bannerText;
    els.saleBanner.hidden = false;
  } else {
    els.saleBanner.hidden = true;
  }

  // Catalog with featured-product highlight
  const featured = String(val("featured_product", "")).trim().toLowerCase();
  els.catalog.innerHTML = "";
  for (const p of PRODUCTS) {
    const card = document.createElement("a");
    card.className = "product";
    card.href = `./product?id=${p.id}`;
    const isFeatured = featured && p.name.toLowerCase() === featured;
    if (isFeatured) card.classList.add("featured");
    card.innerHTML = `
      ${isFeatured ? '<span class="badge">Featured</span>' : ""}
      <div class="thumb" aria-hidden="true">${p.emoji}</div>
      <div class="p-name">${p.name}</div>
      <div class="p-price">${money(p.price)}</div>`;
    els.catalog.appendChild(card);
  }

  // Recommendations rail (segment-targeted at returning_users)
  if (on("show_recommendations")) {
    els.recs.innerHTML = "";
    for (const p of RELATED) {
      const card = document.createElement("a");
      card.className = "product";
      card.href = `./product?id=${p.id}`;
      card.innerHTML = `
        <div class="thumb" aria-hidden="true">${p.emoji}</div>
        <div class="p-name">${p.name}</div>
        <div class="p-price">${money(p.price)}</div>`;
      els.recs.appendChild(card);
    }
    els.recHead.hidden = false;
    els.recs.hidden = false;
  } else {
    els.recHead.hidden = true;
    els.recs.hidden = true;
  }

  els.flagStatus.textContent = "live";
  const env = (window.__FLAGSMITH_ENV_ID__ || "").slice(0, 8);
  els.envMeta.textContent = env
    ? `Flagsmith env ${env}... · flags poll every 5s`
    : "Flagsmith env not configured (edit public/config.js)";
}

document.addEventListener("flags:changed", render);
await ready;
render();
