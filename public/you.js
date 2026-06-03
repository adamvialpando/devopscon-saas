// you.js — identity controls. Persona picker, live flag table, segment match.
import { ready, flagsmith, PERSONAS, currentPersona, setPersona } from "./shared.js";

const FLAG_KEYS = [
  "dark_mode",
  "sale_banner",
  "sale_banner_text",
  "featured_product",
  "free_shipping",
  "checkout_v2",
  "show_recommendations",
  "show_reviews",
  "early_access_badge",
  "recommended_quantity",
  "payment_v2",
];

const SEGMENT_RULES = [
  { name: "premium_users",   describe: "tier == premium",   match: (t) => t.tier === "premium" },
  { name: "beta_testers",    describe: "beta_optin == true", match: (t) => String(t.beta_optin) === "true" },
  { name: "returning_users", describe: "visits > 1",         match: (t) => Number(t.visits || 0) > 1 },
];

const els = {
  personaGrid: document.getElementById("persona-grid"),
  flagRows:    document.getElementById("flag-rows"),
  segmentRows: document.getElementById("segment-rows"),
  flagStatus:  document.getElementById("flag-status"),
  envMeta:     document.getElementById("env-meta"),
};

function renderPersonaGrid() {
  const active = currentPersona();
  els.personaGrid.innerHTML = "";
  for (const [key, p] of Object.entries(PERSONAS)) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "persona-card" + (key === active ? " active" : "");
    const traits = Object.keys(p.traits).length
      ? Object.entries(p.traits).map(([k, v]) => `${k}=${v}`).join(", ")
      : "no traits";
    card.innerHTML = `
      <h3>${p.label}</h3>
      <div class="muted small">${p.description}</div>
      <div class="traits">${traits}</div>
    `;
    card.addEventListener("click", async () => {
      await setPersona(key);
      renderPersonaGrid();
      renderFlags();
      renderSegments();
    });
    els.personaGrid.appendChild(card);
  }
}

function renderFlags() {
  const on  = (k)     => flagsmith.hasFeature(k);
  const val = (k, fb) => flagsmith.getValue(k, { fallback: fb }) ?? fb;

  els.flagRows.innerHTML = FLAG_KEYS.map((k) => {
    const enabled = on(k);
    const value = val(k, "");
    const displayValue = value === "" || value === null || value === undefined
      ? '<span class="muted">—</span>'
      : `<code>${String(value).replace(/</g, "&lt;")}</code>`;
    return `<tr>
      <td><code>${k}</code></td>
      <td><span class="pill ${enabled ? "on" : "off"}">${enabled ? "ON" : "off"}</span></td>
      <td class="val">${displayValue}</td>
    </tr>`;
  }).join("");
}

function renderSegments() {
  const traits = PERSONAS[currentPersona()].traits;
  els.segmentRows.innerHTML = SEGMENT_RULES.map((s) => {
    const matches = s.match(traits);
    return `<tr>
      <td><code>${s.name}</code></td>
      <td class="val">${s.describe}</td>
      <td><span class="pill ${matches ? "in" : "out"}">${matches ? "in segment" : "not in segment"}</span></td>
    </tr>`;
  }).join("");
}

function renderMeta() {
  els.flagStatus.textContent = "live";
  const env = (window.__FLAGSMITH_ENV_ID__ || "").slice(0, 8);
  els.envMeta.textContent = env
    ? `Flagsmith env ${env}... · flags poll every 15s`
    : "Flagsmith env not configured (edit public/config.js)";
}

document.addEventListener("flags:changed", () => {
  renderFlags();
  renderMeta();
});

renderPersonaGrid();
renderSegments();
await ready;
renderFlags();
renderMeta();
