// product.js — product detail page. Reads show_reviews, early_access_badge,
// recommended_quantity. The product id comes from ?id= in the URL.
import { ready, flagsmith } from "./shared.js";

const CATALOG = {
  hoodie:   { name: "Flagsmith Hoodie", price: 65, emoji: "🧥", tag: "Heavyweight cotton fleece, embroidered logo." },
  tee:      { name: "Logo Tee",         price: 28, emoji: "👕", tag: "Soft-hand combed cotton tee." },
  cap:      { name: "Snapback Cap",     price: 24, emoji: "🧢", tag: "Six-panel cap with adjustable snap closure." },
  stickers: { name: "Sticker Pack",     price: 6,  emoji: "✨", tag: "Six die-cut vinyl stickers." },
};

const REVIEWS = [
  { author: "Priya R.",  stars: 5, body: "Fit runs true to size; logo embroidery is sharp." },
  { author: "Jonas K.",  stars: 4, body: "Heavier than expected, in a good way. Worth it." },
  { author: "Devin M.",  stars: 5, body: "Wear it everywhere now. Ten stars if I could." },
];

const id = (new URLSearchParams(location.search).get("id") || "hoodie").toLowerCase();
const product = CATALOG[id] || CATALOG.hoodie;

const els = {
  name:       document.getElementById("product-name"),
  hero:       document.getElementById("product-hero"),
  tag:        document.getElementById("product-tag"),
  price:      document.getElementById("product-price"),
  badges:     document.getElementById("product-badges"),
  qty:        document.getElementById("qty"),
  qtySource:  document.getElementById("qty-source"),
  reviews:    document.getElementById("reviews"),
  reviewsList: document.getElementById("reviews-list"),
  flagStatus: document.getElementById("flag-status"),
  envMeta:    document.getElementById("env-meta"),
};

const money = (n) => `$${n.toFixed(2)}`;

function renderStatic() {
  document.title = `${product.name} · Acme Outfitters`;
  els.name.textContent = product.name;
  els.hero.textContent = product.emoji;
  els.tag.textContent = product.tag;
  els.price.textContent = money(product.price);
}

function render() {
  const on  = (k)     => flagsmith.hasFeature(k);
  const val = (k, fb) => flagsmith.getValue(k, { fallback: fb }) ?? fb;

  // Beta badge for early_access_badge (segment-targeted at beta_testers)
  els.badges.innerHTML = on("early_access_badge")
    ? '<span class="badge beta">Early access</span>'
    : "";

  // Recommended quantity comes from a flag value; user can override.
  const qtyVal = parseInt(val("recommended_quantity", "1"), 10) || 1;
  if (!els.qty.dataset.touched) {
    els.qty.value = String(qtyVal);
  }
  els.qtySource.textContent = `(flag default: ${qtyVal})`;

  // Reviews block (show_reviews)
  if (on("show_reviews")) {
    els.reviewsList.innerHTML = REVIEWS.map((r) => `
      <div class="review">
        <div><span class="author">${r.author}</span> <span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span></div>
        <div>${r.body}</div>
      </div>`).join("");
    els.reviews.hidden = false;
  } else {
    els.reviews.hidden = true;
  }

  els.flagStatus.textContent = "live";
  const env = (window.__FLAGSMITH_ENV_ID__ || "").slice(0, 8);
  els.envMeta.textContent = env
    ? `Flagsmith env ${env}... · flags poll every 15s`
    : "Flagsmith env not configured (edit public/config.js)";
}

els.qty.addEventListener("input", () => { els.qty.dataset.touched = "1"; });

document.addEventListener("flags:changed", render);
renderStatic();
await ready;
render();
