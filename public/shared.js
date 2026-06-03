// shared.js — Flagsmith init + identity helpers used by every page.
//
// Pages import this as an ES module *after* including config.js, which sets
// window.__FLAGSMITH_ENV_ID__ on the page.
//
// Usage:
//   import { ready, flagsmith, getIdentifier, setPersona, currentPersona } from "./shared.js";
//   await ready;
//   // ...flag reads here

import flagsmith from "https://esm.sh/flagsmith@10";

const STORAGE_KEY = "acme.persona";

// Personas drive identity-based targeting. Each has a stable identifier (so
// segment evaluation is consistent across pages) and a trait set sent on
// flagsmith.identify(). The identifier prefix lets you spot demo traffic in
// the Flagsmith UI.
export const PERSONAS = {
  visitor: {
    label: "Visitor (anonymous)",
    description: "Default. No traits set; only environment-level flag defaults apply.",
    identifier: null, // anonymous - skip identify()
    traits: {},
  },
  free: {
    label: "Free tier user",
    description: "Logged in, tier=free.",
    identifier: "demo.free@acme.test",
    traits: { tier: "free" },
  },
  premium: {
    label: "Premium tier user",
    description: "Logged in, tier=premium. Matches premium_users segment.",
    identifier: "demo.premium@acme.test",
    traits: { tier: "premium" },
  },
  beta: {
    label: "Beta tester",
    description: "beta_optin=true. Matches beta_testers segment.",
    identifier: "demo.beta@acme.test",
    traits: { beta_optin: "true" },
  },
  returning: {
    label: "Returning user",
    description: "visits=5. Matches returning_users segment.",
    identifier: "demo.returning@acme.test",
    traits: { visits: 5 },
  },
};

const FLAG_DEFAULTS = {
  dark_mode: { enabled: false },
  sale_banner: { enabled: false },
  sale_banner_text: { enabled: true, value: "Conference special, 25% off everything" },
  featured_product: { enabled: true, value: "Flagsmith Hoodie" },
  free_shipping: { enabled: false },
  checkout_v2: { enabled: false },
  show_recommendations: { enabled: false },
  show_reviews: { enabled: true },
  early_access_badge: { enabled: false },
  recommended_quantity: { enabled: true, value: "1" },
  payment_v2: { enabled: false },
  show_qr: { enabled: false },
  show_raffle_qr: { enabled: false },
};

export function currentPersona() {
  const key = localStorage.getItem(STORAGE_KEY) || "visitor";
  return PERSONAS[key] ? key : "visitor";
}

export function getIdentifier() {
  return PERSONAS[currentPersona()].identifier;
}

export async function setPersona(key) {
  if (!PERSONAS[key]) throw new Error(`unknown persona: ${key}`);
  localStorage.setItem(STORAGE_KEY, key);
  await applyPersona();
}

async function applyPersona() {
  const persona = PERSONAS[currentPersona()];
  if (!persona.identifier) {
    // Anonymous: reset to environment-level flags.
    await flagsmith.logout();
  } else {
    await flagsmith.identify(persona.identifier, persona.traits);
  }
}

// Top-bar persona chip — rendered once per page if the element is present.
function renderPersonaChip() {
  const el = document.getElementById("persona-chip");
  if (!el) return;
  el.textContent = PERSONAS[currentPersona()].label;
}

function applyDarkMode() {
  // Global theme switch driven by dark_mode. Applied to <html> so it cascades
  // to every page-specific component (storefront, product, checkout, you).
  const on = flagsmith.hasFeature("dark_mode");
  document.documentElement.dataset.theme = on ? "dark" : "light";
  // Storefront blocks tagged data-store-theme also pick it up.
  document.querySelectorAll("[data-store-theme]").forEach((node) => {
    node.dataset.theme = on ? "dark" : "light";
  });
}

function ensureShareQrCard() {
  // Inject the share QR (bottom-right) once per page load, hidden by default.
  // Encodes the Vercel URL so a laptop visitor can scan it onto a phone or
  // hand the link to someone next to them.
  if (document.getElementById("qr-card")) return;
  const card = document.createElement("aside");
  card.className = "qr-card";
  card.id = "qr-card";
  card.setAttribute("aria-label", "Share this demo");
  card.hidden = true;
  card.innerHTML =
    '<div class="qr-label">Take it with you</div>' +
    '<img class="qr-image" src="./qr.svg" alt="QR code to this demo URL">' +
    '<div class="qr-url muted">devopscon-saas-ypeb.vercel.app</div>';
  document.body.appendChild(card);
}

function ensureRaffleQrCard() {
  // Inject the raffle QR (bottom-left) once per page load, hidden by default.
  if (document.getElementById("raffle-qr-card")) return;
  const card = document.createElement("aside");
  card.className = "qr-card raffle";
  card.id = "raffle-qr-card";
  card.setAttribute("aria-label", "Raffle entry form");
  card.hidden = true;
  card.innerHTML =
    '<div class="qr-label">Win our raffle</div>' +
    '<img class="qr-image" src="./raffle-qr.svg" alt="QR code to the raffle entry form">' +
    '<div class="qr-url muted">Enter the giveaway</div>';
  document.body.appendChild(card);
}

function applyShareQr() {
  const card = document.getElementById("qr-card");
  if (card) card.hidden = !flagsmith.hasFeature("show_qr");
}

function applyRaffleQr() {
  const card = document.getElementById("raffle-qr-card");
  if (card) card.hidden = !flagsmith.hasFeature("show_raffle_qr");
}

const ENV_ID = window.__FLAGSMITH_ENV_ID__ || "";

// The ready promise resolves after init + initial identify (if any). Pages
// await it before reading flag values, so the first render is correct.
export const ready = (async () => {
  if (!ENV_ID || ENV_ID.startsWith("REPLACE_ME")) {
    console.warn("shared.js: FLAGSMITH_ENV_ID is unset; using defaults only.");
    return;
  }
  await flagsmith.init({
    environmentID: ENV_ID,
    cacheFlags: false,
    enableLogs: false,
    realtime: false, // SaaS realtime needs Enterprise; poll every 5s instead.
    defaultFlags: FLAG_DEFAULTS,
    onChange: () => {
      applyDarkMode();
      applyShareQr();
      applyRaffleQr();
      renderPersonaChip();
      // Each page sets its own onChange via flagsmith.subscribe in its module.
      document.dispatchEvent(new CustomEvent("flags:changed"));
    },
  });
  await applyPersona();
  ensureShareQrCard();
  ensureRaffleQrCard();
  applyDarkMode();
  applyShareQr();
  applyRaffleQr();
  renderPersonaChip();
  flagsmith.startListening(5000);
})();

export { flagsmith };
