/*
 * Freebox Ultra Card (FR)
 * Carte Home Assistant pour Freebox Ultra (V9) : état, débits, températures,
 * ventilateur, appels manqués, Wi-Fi et redémarrage. Style verre, optimisée
 * pour iPhone, iPad et kiosque en mode portrait.
 * Entités issues de l'intégration officielle « Freebox ».
 */

const CARD_VERSION = "1.0.0";

const DEFAULTS = {
  name: "Freebox Ultra",
  device_tracker_entity: "device_tracker.freebox_v9_r1",
  wifi_entity: "switch.freebox_v9_r1_wi_fi",
  download_entity: "sensor.freebox_v9_r1_vitesse_de_telechargement",
  upload_entity: "sensor.freebox_v9_r1_vitesse_d_envoi",
  fan_entity: "sensor.freebox_v9_r1_ventilateur_1",
  temperature_entity: "sensor.freebox_v9_r1_temperature_1",
  cpu_entities: [
    "sensor.freebox_v9_r1_temperature_cpu_0",
    "sensor.freebox_v9_r1_temperature_cpu_1",
    "sensor.freebox_v9_r1_temperature_cpu_2",
    "sensor.freebox_v9_r1_temperature_cpu_3",
  ],
  missed_calls_entity: "sensor.freebox_v9_r1_appels_manques",
  mark_calls_button: "button.freebox_v9_r1_marquer_les_appels_comme_lus",
  reboot_button: "button.freebox_v9_r1_redemarrer",
  show_cpu: true,
  show_calls: true,
  show_actions: true,
  temp_warn: 65,
  temp_alert: 80,
  scale: 1,
  image_mode: "background",
  image: "",
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const isNum = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
const unavailable = (st) => !st || st.state === "unavailable" || st.state === "unknown";

/* Formate un débit selon son unité d'origine (o/s, ko/s, Mo/s, bit/s...) */
function formatRate(st) {
  if (unavailable(st) || !isNum(st.state)) return { value: "—", unit: "" };
  let v = Number(st.state);
  const unit = (st.attributes.unit_of_measurement || "").replace("o", "B");
  const table = {
    "B/s": 1, "kB/s": 1e3, "KB/s": 1e3, "MB/s": 1e6, "GB/s": 1e9,
    "bit/s": 0.125, "kbit/s": 125, "Mbit/s": 125000, "Gbit/s": 125000000,
  };
  const bytes = v * (table[unit] ?? 1e3); // l'intégration Freebox renvoie des ko/s
  // Affichage en Mb/s (débit réseau classique)
  const bits = bytes * 8;
  if (bits >= 1e9) return { value: (bits / 1e9).toFixed(2), unit: "Gb/s" };
  if (bits >= 1e6) return { value: (bits / 1e6).toFixed(bits >= 1e8 ? 0 : 1), unit: "Mb/s" };
  if (bits >= 1e3) return { value: (bits / 1e3).toFixed(0), unit: "kb/s" };
  return { value: bits.toFixed(0), unit: "b/s" };
}

class FreeboxUltraCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("freebox-ultra-card-editor");
  }

  static getStubConfig() {
    return { ...DEFAULTS };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
    this._config = null;
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config };
    if (!Array.isArray(this._config.cpu_entities)) this._config.cpu_entities = [];
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const sig = this._entityIds().map((e) => {
      const s = hass.states[e];
      return s ? s.state + "|" + (s.attributes.unit_of_measurement || "") : "x";
    }).join(";");
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
  }

  getCardSize() {
    return 7;
  }

  _entityIds() {
    const c = this._config;
    return [
      c.device_tracker_entity, c.wifi_entity, c.download_entity, c.upload_entity,
      c.fan_entity, c.temperature_entity, c.missed_calls_entity,
      ...(c.cpu_entities || []),
    ].filter(Boolean);
  }

  _state(id) {
    return id && this._hass ? this._hass.states[id] : undefined;
  }

  _tempClass(t) {
    const c = this._config;
    if (!isNum(t)) return "off";
    if (Number(t) >= c.temp_alert) return "alert";
    if (Number(t) >= c.temp_warn) return "warn";
    return "ok";
  }

  _tempTile(label, id) {
    const st = this._state(id);
    const ok = !unavailable(st) && isNum(st.state);
    const val = ok ? Number(st.state).toFixed(0) : "—";
    const cls = ok ? this._tempClass(st.state) : "off";
    return `<button class="tile temp ${cls}" data-more="${esc(id)}">
      <span class="tl">${esc(label)}</span>
      <span class="tv">${val}<small>${ok ? "°C" : ""}</small></span>
    </button>`;
  }

  _render() {
    const c = this._config;
    const h = this._hass;
    if (!c || !h) return;

    const tracker = this._state(c.device_tracker_entity);
    const online = tracker && tracker.state === "home";
    const trackerKnown = !unavailable(tracker);
    const statusText = !trackerKnown ? "Indisponible" : online ? "En ligne" : "Hors ligne";
    const statusCls = !trackerKnown ? "off" : online ? "ok" : "alert";

    const wifi = this._state(c.wifi_entity);
    const wifiOn = wifi && wifi.state === "on";
    const wifiKnown = !unavailable(wifi);

    const dl = formatRate(this._state(c.download_entity));
    const ul = formatRate(this._state(c.upload_entity));

    const fan = this._state(c.fan_entity);
    const fanOk = !unavailable(fan) && isNum(fan.state);
    const fanTxt = fanOk ? Number(fan.state).toFixed(0) : "—";
    const fanUnit = fanOk ? esc(fan.attributes.unit_of_measurement || "tr/min") : "";

    const calls = this._state(c.missed_calls_entity);
    const callsOk = !unavailable(calls) && isNum(calls.state);
    const callsN = callsOk ? Number(calls.state) : 0;

    const imageUrl = c.image ? esc(c.image) : "";
    const bg = imageUrl && c.image_mode === "background"
      ? `background-image: linear-gradient(160deg, rgba(14,16,28,.78), rgba(14,16,28,.9)), url('${imageUrl}'); background-size: cover; background-position: center;`
      : "";
    const banner = imageUrl && c.image_mode === "banner"
      ? `<div class="banner" style="background-image:url('${imageUrl}')"></div>`
      : "";

    const cpuTiles = (c.cpu_entities || []).map((id, i) => this._tempTile("CPU " + i, id)).join("");

    const html = `
      <style>
        :host { display:block; font-size: calc(16px * ${Number(c.scale) || 1}); }
        * { box-sizing: border-box; }
        ha-card {
          position: relative; overflow: hidden; color: #f4f6fb;
          border-radius: 1.5em; padding: 0; border: 1px solid rgba(255,255,255,.14);
          background: linear-gradient(160deg, #1b1e32 0%, #241a2a 55%, #2d1519 100%);
          ${bg}
          box-shadow: 0 .6em 2em rgba(0,0,0,.35);
        }
        .banner { height: 7em; background-size: cover; background-position: center; }
        .wrap { padding: 1.1em; display: flex; flex-direction: column; gap: .9em; }
        .glass {
          background: rgba(255,255,255,.07);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 1.1em;
        }
        .head { display:flex; align-items:center; justify-content:space-between; gap:.8em; padding: .9em 1em; }
        .title { display:flex; flex-direction:column; gap:.2em; min-width:0; }
        .title b { font-size: 1.15em; font-weight: 650; letter-spacing:.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .status { display:inline-flex; align-items:center; gap:.45em; font-size:.82em; opacity:.92; }
        .dot { width:.6em; height:.6em; border-radius:50%; background:#8a8f9c; box-shadow:0 0 .6em currentColor; }
        .status.ok .dot { background:#3ddc84; color:#3ddc84; }
        .status.alert .dot { background:#ff5a5f; color:#ff5a5f; }
        button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; padding: 0; -webkit-tap-highlight-color: transparent; }
        .wifi {
          display:inline-flex; align-items:center; gap:.5em; padding:.5em .85em; border-radius:2em;
          background: rgba(255,255,255,.09); border:1px solid rgba(255,255,255,.14); font-size:.85em; font-weight:600;
          transition: background .2s, border-color .2s;
        }
        .wifi.on { background: rgba(61,220,132,.18); border-color: rgba(61,220,132,.5); }
        .wifi.off { opacity:.75; }
        .wifi svg { width:1.2em; height:1.2em; fill: currentColor; }
        .speeds { display:grid; grid-template-columns: 1fr 1fr; gap:.7em; }
        .speed { padding: .9em 1em; display:flex; flex-direction:column; gap:.25em; text-align:left; width:100%; }
        .speed .lbl { font-size:.74em; text-transform:uppercase; letter-spacing:.08em; opacity:.7; display:flex; align-items:center; gap:.4em; }
        .speed .val { font-size:1.9em; font-weight:700; line-height:1.05; font-variant-numeric: tabular-nums; }
        .speed .val small { font-size:.42em; font-weight:600; opacity:.75; margin-left:.25em; }
        .speed.dl .lbl { color:#7cc4ff; } .speed.ul .lbl { color:#ffb86b; }
        .section-title { font-size:.74em; text-transform:uppercase; letter-spacing:.08em; opacity:.65; margin: .1em .2em -.3em; }
        .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(5.2em, 1fr)); gap:.6em; }
        .tile { padding:.65em .5em; display:flex; flex-direction:column; align-items:center; gap:.2em;
          background: rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); border-radius:1em; }
        .tile .tl { font-size:.7em; opacity:.7; text-transform:uppercase; letter-spacing:.06em; }
        .tile .tv { font-size:1.25em; font-weight:650; font-variant-numeric: tabular-nums; }
        .tile .tv small { font-size:.6em; opacity:.75; margin-left:.1em; }
        .temp.ok { border-color: rgba(61,220,132,.4); } .temp.ok .tv { color:#7ef0ae; }
        .temp.warn { border-color: rgba(255,184,107,.55); } .temp.warn .tv { color:#ffc680; }
        .temp.alert { border-color: rgba(255,90,95,.65); background: rgba(255,90,95,.12); } .temp.alert .tv { color:#ff8a8e; }
        .temp.off .tv { opacity:.5; }
        .calls { display:flex; align-items:center; justify-content:space-between; gap:.8em; padding:.8em 1em; }
        .calls .info { display:flex; align-items:center; gap:.7em; min-width:0; }
        .badge { min-width:1.9em; height:1.9em; border-radius:1em; display:inline-flex; align-items:center; justify-content:center;
          font-weight:700; padding:0 .55em; background: rgba(255,255,255,.12); }
        .badge.has { background:#cd1e25; box-shadow: 0 0 .9em rgba(205,30,37,.55); }
        .btn { padding:.55em .95em; border-radius:.8em; background: rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.16);
          font-size:.82em; font-weight:600; transition: background .2s; }
        .btn:active { background: rgba(255,255,255,.2); }
        .btn.danger { border-color: rgba(255,90,95,.55); color:#ff9a9d; }
        .btn[disabled] { opacity:.4; pointer-events:none; }
        .actions { display:flex; justify-content:flex-end; gap:.6em; }
      </style>
      <ha-card>
        ${banner}
        <div class="wrap">
          <div class="head glass">
            <div class="title">
              <b>${esc(c.name)}</b>
              <span class="status ${statusCls}"><span class="dot"></span>${statusText}</span>
            </div>
            ${c.wifi_entity ? `
            <button class="wifi ${wifiOn ? "on" : "off"}" data-action="wifi" ${wifiKnown ? "" : "disabled"}>
              <svg viewBox="0 0 24 24"><path d="M12 21l3.5-4.4a5.5 5.5 0 0 0-7 0L12 21zm0-14C8.4 7 5.1 8.4 2.6 10.7l1.9 2.4A12.4 12.4 0 0 1 12 10.2c2.8 0 5.4.9 7.5 2.9l1.9-2.4C18.9 8.4 15.6 7 12 7zm0 5.2c-1.9 0-3.7.7-5.1 1.9l1.9 2.4a6.4 6.4 0 0 1 6.4 0l1.9-2.4A8.2 8.2 0 0 0 12 12.2z"/></svg>
              Wi-Fi ${wifiKnown ? (wifiOn ? "activé" : "coupé") : "?"}
            </button>` : ""}
          </div>

          <div class="speeds">
            <button class="speed glass dl" data-more="${esc(c.download_entity)}">
              <span class="lbl">↓ Téléchargement</span>
              <span class="val">${esc(dl.value)}<small>${esc(dl.unit)}</small></span>
            </button>
            <button class="speed glass ul" data-more="${esc(c.upload_entity)}">
              <span class="lbl">↑ Envoi</span>
              <span class="val">${esc(ul.value)}<small>${esc(ul.unit)}</small></span>
            </button>
          </div>

          <div class="section-title">Températures et ventilation</div>
          <div class="grid">
            ${c.temperature_entity ? this._tempTile("Carte", c.temperature_entity) : ""}
            ${c.show_cpu ? cpuTiles : ""}
            ${c.fan_entity ? `<button class="tile" data-more="${esc(c.fan_entity)}">
              <span class="tl">Ventilo</span>
              <span class="tv">${fanTxt}<small>${fanUnit}</small></span>
            </button>` : ""}
          </div>

          ${c.show_calls && c.missed_calls_entity ? `
          <div class="calls glass">
            <div class="info">
              <span class="badge ${callsN > 0 ? "has" : ""}">${callsOk ? callsN : "—"}</span>
              <span>${callsN > 1 ? "Appels manqués" : "Appel manqué"}</span>
            </div>
            ${c.mark_calls_button ? `<button class="btn" data-action="mark" ${callsN > 0 ? "" : "disabled"}>Marquer comme lus</button>` : ""}
          </div>` : ""}

          ${c.show_actions && c.reboot_button ? `
          <div class="actions">
            <button class="btn danger" data-action="reboot">Redémarrer la Freebox</button>
          </div>` : ""}
        </div>
      </ha-card>`;

    this.shadowRoot.innerHTML = html;
    this._bind();
  }

  _bind() {
    const root = this.shadowRoot;
    root.querySelectorAll("[data-more]").forEach((el) => {
      el.addEventListener("click", () => this._moreInfo(el.dataset.more));
    });
    root.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", () => this._action(el.dataset.action));
    });
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId },
    }));
  }

  _action(name) {
    const c = this._config;
    const h = this._hass;
    if (!h) return;
    if (name === "wifi" && c.wifi_entity) {
      h.callService("switch", "toggle", { entity_id: c.wifi_entity });
    } else if (name === "mark" && c.mark_calls_button) {
      h.callService("button", "press", { entity_id: c.mark_calls_button });
    } else if (name === "reboot" && c.reboot_button) {
      if (window.confirm("Redémarrer la Freebox ? Internet sera coupé quelques minutes.")) {
        h.callService("button", "press", { entity_id: c.reboot_button });
      }
    }
  }
}

/* ---------- Éditeur visuel ---------- */
class FreeboxUltraCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _schema() {
    const ent = (name, domain) => ({ name, selector: { entity: { domain } } });
    return [
      { name: "name", selector: { text: {} } },
      ent("device_tracker_entity", "device_tracker"),
      ent("wifi_entity", "switch"),
      ent("download_entity", "sensor"),
      ent("upload_entity", "sensor"),
      ent("temperature_entity", "sensor"),
      { name: "cpu_entities", selector: { entity: { domain: "sensor", multiple: true } } },
      ent("fan_entity", "sensor"),
      ent("missed_calls_entity", "sensor"),
      ent("mark_calls_button", "button"),
      ent("reboot_button", "button"),
      {
        type: "grid", name: "", schema: [
          { name: "show_cpu", selector: { boolean: {} } },
          { name: "show_calls", selector: { boolean: {} } },
          { name: "show_actions", selector: { boolean: {} } },
        ],
      },
      {
        type: "grid", name: "", schema: [
          { name: "temp_warn", selector: { number: { min: 30, max: 120, mode: "box" } } },
          { name: "temp_alert", selector: { number: { min: 30, max: 120, mode: "box" } } },
          { name: "scale", selector: { number: { min: 0.5, max: 2, step: 0.05, mode: "box" } } },
        ],
      },
      {
        name: "image_mode",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "background", label: "Arrière-plan" },
              { value: "banner", label: "Bandeau" },
            ],
          },
        },
      },
      { name: "image", selector: { text: {} } },
    ];
  }

  _build() {
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => ({
        name: "Nom", device_tracker_entity: "Suivi de la Freebox (device_tracker)",
        wifi_entity: "Interrupteur Wi-Fi", download_entity: "Vitesse de téléchargement",
        upload_entity: "Vitesse d'envoi", temperature_entity: "Température carte",
        cpu_entities: "Températures CPU", fan_entity: "Ventilateur",
        missed_calls_entity: "Appels manqués", mark_calls_button: "Bouton « Marquer comme lus »",
        reboot_button: "Bouton « Redémarrer »", show_cpu: "Afficher les CPU",
        show_calls: "Afficher les appels", show_actions: "Afficher le redémarrage",
        temp_warn: "Seuil d'alerte (°C)", temp_alert: "Seuil critique (°C)",
        scale: "Échelle", image_mode: "Mode de l'image", image: "Image (facultatif, ex. /local/image/freebox.webp)",
      }[s.name] || s.name);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config = { ...this._config, ...ev.detail.value };
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: this._config }, bubbles: true, composed: true,
        }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = this._schema();
  }
}

customElements.define("freebox-ultra-card", FreeboxUltraCard);
customElements.define("freebox-ultra-card-editor", FreeboxUltraCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "freebox-ultra-card",
  name: "Freebox Ultra Card (FR)",
  description: "État, débits, températures, appels manqués, Wi-Fi et redémarrage de la Freebox Ultra.",
  preview: false,
});

console.info(
  `%c FREEBOX-ULTRA-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#cd1e25;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#cd1e25;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px"
);
