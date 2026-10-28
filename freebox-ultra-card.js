{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * Freebox Ultra Card (FR)
 * Carte Home Assistant pour Freebox Ultra (V9) : état, débits, températures,
 * ventilateur, appels manqués, Wi-Fi et redémarrage. Style verre, optimisée
 * pour iPhone, iPad et kiosque en mode portrait.
 * Entités issues de l'intégration officielle « Freebox ».
 */

const CARD_VERSION = "1.2.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

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
  wan_entity: "binary_sensor.freebox_server_etat_du_reseau_etendu_wan",
  external_ip_entity: "sensor.freebox_server_ip_externe",
  uptime_entity: "sensor.freebox_server_temps_de_fonctionnement",
  missed_calls_entity: "sensor.freebox_v9_r1_appels_manques",
  mark_calls_button: "button.freebox_v9_r1_marquer_les_appels_comme_lus",
  reboot_button: "button.freebox_v9_r1_redemarrer",
  show_network: true,
  show_cpu: true,
  show_calls: true,
  show_actions: true,
  temp_warn: 65,
  temp_alert: 80,
  scale: 1,
  theme: "auto", nuance: "theme", intensite: 1, // auto (suit le thème de Home Assistant), light, dark
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

/* Temps de fonctionnement : secondes, minutes/heures/jours, ou date de démarrage (timestamp) */
function formatUptime(st) {
  if (unavailable(st)) return "—";
  let secs;
  if (isNum(st.state)) {
    secs = Number(st.state);
    const u = (st.attributes.unit_of_measurement || "").toLowerCase();
    if (u === "ms") secs /= 1000;
    else if (u === "min") secs *= 60;
    else if (u === "h") secs *= 3600;
    else if (u === "d" || u === "j") secs *= 86400;
  } else {
    const t = Date.parse(st.state);
    if (isNaN(t)) return String(st.state);
    secs = (Date.now() - t) / 1000;
  }
  if (!(secs >= 0)) return "—";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
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
    }).join(";") + "#" + (this._isDark() ? "d" : "l");
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
      c.wan_entity, c.external_ip_entity, c.uptime_entity,
      ...(c.cpu_entities || []),
    ].filter(Boolean);
  }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    if (typeof dm === "boolean") return dm;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
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

    const wan = this._state(c.wan_entity);
    const wanKnown = !unavailable(wan);
    const wanOn = wan && wan.state === "on";
    const wanTxt = !wanKnown ? "Indisponible" : wanOn ? "Connecté" : "Déconnecté";
    const wanCls = !wanKnown ? "off" : wanOn ? "ok" : "alert";
    const ipSt = this._state(c.external_ip_entity);
    const ipTxt = unavailable(ipSt) ? "—" : ipSt.state;
    const upTxt = formatUptime(this._state(c.uptime_entity));
    const showNet = c.show_network && (c.wan_entity || c.external_ip_entity || c.uptime_entity);

    const dark = this._isDark();
    const imageUrl = c.image ? esc(c.image) : "";
    const bg = imageUrl && c.image_mode === "background"
      ? `background-image: linear-gradient(160deg, ${dark ? "rgba(14,16,28,.78), rgba(14,16,28,.9)" : "rgba(255,255,255,.82), rgba(245,246,250,.92)"}), url('${imageUrl}'); background-size: cover; background-position: center;`
      : "";
    const banner = imageUrl && c.image_mode === "banner"
      ? `<div class="banner" style="background-image:url('${imageUrl}')"></div>`
      : "";

    const cpuTiles = (c.cpu_entities || []).map((id, i) => this._tempTile("CPU " + i, id)).join("");

    const html = `
      <style>
        :host { display:block; font-size: calc(16px * ${Number(c.scale) || 1}); }
        * { box-sizing: border-box; }
        ha-card.dark {
          --fb-text: #f4f6fb; --fb-bg: var(--g-bg-x,linear-gradient(160deg, #1b1e32 0%, #241a2a 55%, #2d1519 100%));
          --fb-border: rgba(255,255,255,.14); --fb-shadow: 0 .6em 2em rgba(0,0,0,.35);
          --fb-glass: rgba(255,255,255,.07); --fb-glass-b: rgba(255,255,255,.13);
          --fb-fill: rgba(255,255,255,.09); --fb-fill-b: rgba(255,255,255,.16); --fb-press: rgba(255,255,255,.2);
          --fb-ok: #3ddc84; --fb-ok-t: #7ef0ae; --fb-warn: #ffb86b; --fb-warn-t: #ffc680;
          --fb-alert: #ff5a5f; --fb-alert-t: #ff8a8e; --fb-dl: #7cc4ff; --fb-ul: #ffb86b; --fb-neutral: #8a8f9c;
          --fb-ok-bg: rgba(61,220,132,.18); --fb-alert-bg: rgba(255,90,95,.12);
        }
        ha-card.light {
          --fb-text: #1c2030; --fb-bg: var(--g-bg-x,linear-gradient(160deg, #f8f9fd 0%, #eef1f8 55%, #f8eff0 100%));
          --fb-border: rgba(20,24,40,.12); --fb-shadow: 0 .4em 1.4em rgba(20,24,40,.12);
          --fb-glass: rgba(255,255,255,.7); --fb-glass-b: rgba(20,24,40,.1);
          --fb-fill: rgba(20,24,40,.05); --fb-fill-b: rgba(20,24,40,.14); --fb-press: rgba(20,24,40,.12);
          --fb-ok: #1a9d55; --fb-ok-t: #12803f; --fb-warn: #d08416; --fb-warn-t: #a8620a;
          --fb-alert: #d32f35; --fb-alert-t: #b3242a; --fb-dl: #1769c2; --fb-ul: #c0640f; --fb-neutral: #8a8f9c;
          --fb-ok-bg: rgba(26,157,85,.12); --fb-alert-bg: rgba(211,47,53,.1);
        }
        ha-card {
          position: relative; overflow: hidden; color: var(--fb-text);
          border-radius: 1.5em; padding: 0; border: 1px solid var(--fb-border);
          background: var(--fb-bg);
          ${bg}
          box-shadow: var(--fb-shadow);
        }
        .banner { height: 7em; background-size: cover; background-position: center; }
        .wrap { padding: 1.1em; display: flex; flex-direction: column; gap: .9em; }
        .glass {
          background: var(--fb-glass);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          border: 1px solid var(--fb-glass-b);
          border-radius: 1.1em;
        }
        .head { display:flex; align-items:center; justify-content:space-between; gap:.8em; padding: .9em 1em; }
        .title { display:flex; flex-direction:column; gap:.2em; min-width:0; }
        .title b { font-size: 1.15em; font-weight: 650; letter-spacing:.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .status { display:inline-flex; align-items:center; gap:.45em; font-size:.82em; opacity:.92; }
        .dot { width:.6em; height:.6em; border-radius:50%; background:var(--fb-neutral); box-shadow:0 0 .6em currentColor; flex:none; }
        .ok .dot { background:var(--fb-ok); color:var(--fb-ok); }
        .alert .dot { background:var(--fb-alert); color:var(--fb-alert); }
        button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; padding: 0; -webkit-tap-highlight-color: transparent; }
        .wifi {
          display:inline-flex; align-items:center; gap:.5em; padding:.5em .85em; border-radius:2em;
          background: var(--fb-fill); border:1px solid var(--fb-fill-b); font-size:.85em; font-weight:600;
          transition: background .2s, border-color .2s;
        }
        .wifi.on { background: var(--fb-ok-bg); border-color: var(--fb-ok); }
        .wifi.off { opacity:.75; }
        .wifi svg { width:1.2em; height:1.2em; fill: currentColor; }
        .speeds { display:grid; grid-template-columns: 1fr 1fr; gap:.7em; }
        .speed { padding: .9em 1em; display:flex; flex-direction:column; gap:.25em; text-align:left; width:100%; }
        .speed .lbl { font-size:.74em; text-transform:uppercase; letter-spacing:.08em; opacity:.7; display:flex; align-items:center; gap:.4em; }
        .speed .val { font-size:1.9em; font-weight:700; line-height:1.05; font-variant-numeric: tabular-nums; }
        .speed .val small { font-size:.42em; font-weight:600; opacity:.75; margin-left:.25em; }
        .speed.dl .lbl { color:var(--fb-dl); } .speed.ul .lbl { color:var(--fb-ul); }
        .net { display:grid; grid-template-columns: repeat(auto-fit, minmax(8.2em, 1fr)); gap:.4em .8em; padding:.8em 1em; }
        .net button { text-align:left; display:flex; flex-direction:column; gap:.2em; min-width:0; }
        .net .nl { font-size:.7em; text-transform:uppercase; letter-spacing:.08em; opacity:.65; }
        .net .nv { font-size:.95em; font-weight:650; display:flex; align-items:center; gap:.45em; overflow-wrap:anywhere; font-variant-numeric: tabular-nums; }
        .section-title { font-size:.74em; text-transform:uppercase; letter-spacing:.08em; opacity:.65; margin: .1em .2em -.3em; }
        .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(5.2em, 1fr)); gap:.6em; }
        .tile { padding:.65em .5em; display:flex; flex-direction:column; align-items:center; gap:.2em;
          background: var(--fb-glass); border:1px solid var(--fb-glass-b); border-radius:1em; }
        .tile .tl { font-size:.7em; opacity:.7; text-transform:uppercase; letter-spacing:.06em; }
        .tile .tv { font-size:1.25em; font-weight:650; font-variant-numeric: tabular-nums; }
        .tile .tv small { font-size:.6em; opacity:.75; margin-left:.1em; }
        .temp.ok { border-color: var(--fb-ok); } .temp.ok .tv { color:var(--fb-ok-t); }
        .temp.warn { border-color: var(--fb-warn); } .temp.warn .tv { color:var(--fb-warn-t); }
        .temp.alert { border-color: var(--fb-alert); background: var(--fb-alert-bg); } .temp.alert .tv { color:var(--fb-alert-t); }
        .temp.off .tv { opacity:.5; }
        .calls { display:flex; align-items:center; justify-content:space-between; gap:.8em; padding:.8em 1em; }
        .calls .info { display:flex; align-items:center; gap:.7em; min-width:0; }
        .badge { min-width:1.9em; height:1.9em; border-radius:1em; display:inline-flex; align-items:center; justify-content:center;
          font-weight:700; padding:0 .55em; background: var(--fb-fill-b); }
        .badge.has { background:#cd1e25; color:#fff; box-shadow: 0 0 .9em rgba(205,30,37,.45); }
        .btn { padding:.55em .95em; border-radius:.8em; background: var(--fb-fill); border:1px solid var(--fb-fill-b);
          font-size:.82em; font-weight:600; transition: background .2s; }
        .btn:active { background: var(--fb-press); }
        .btn.danger { border-color: var(--fb-alert); color:var(--fb-alert-t); }
        .btn[disabled] { opacity:.4; pointer-events:none; }
        .actions { display:flex; justify-content:flex-end; gap:.6em; }
      </style>
      <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(this._config, dark)}">
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

          ${showNet ? `
          <div class="net glass">
            ${c.wan_entity ? `<button data-more="${esc(c.wan_entity)}">
              <span class="nl">Réseau (WAN)</span>
              <span class="nv ${wanCls}"><span class="dot"></span>${wanTxt}</span>
            </button>` : ""}
            ${c.external_ip_entity ? `<button data-more="${esc(c.external_ip_entity)}">
              <span class="nl">IP externe</span>
              <span class="nv">${esc(ipTxt)}</span>
            </button>` : ""}
            ${c.uptime_entity ? `<button data-more="${esc(c.uptime_entity)}">
              <span class="nl">En fonctionnement</span>
              <span class="nv">${esc(upTxt)}</span>
            </button>` : ""}
          </div>` : ""}

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
      ent("wan_entity", "binary_sensor"),
      ent("external_ip_entity", "sensor"),
      ent("uptime_entity", "sensor"),
      ent("temperature_entity", "sensor"),
      { name: "cpu_entities", selector: { entity: { domain: "sensor", multiple: true } } },
      ent("fan_entity", "sensor"),
      ent("missed_calls_entity", "sensor"),
      ent("mark_calls_button", "button"),
      ent("reboot_button", "button"),
      {
        type: "grid", name: "", schema: [
          { name: "show_network", selector: { boolean: {} } },
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
        name: "theme",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "auto", label: "Automatique (thème de Home Assistant)" },
              { value: "light", label: "Clair" },
              { value: "dark", label: "Sombre" },
            ],
          },
        },
      }, ...GV_FIELDS,
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
      this._form.computeLabel = (s) => ({ ...GV_LABELS,
        name: "Nom", device_tracker_entity: "Suivi de la Freebox (device_tracker)",
        wifi_entity: "Interrupteur Wi-Fi", download_entity: "Vitesse de téléchargement",
        upload_entity: "Vitesse d'envoi", wan_entity: "État du réseau étendu (WAN)",
        external_ip_entity: "IP externe", uptime_entity: "Temps de fonctionnement",
        show_network: "Afficher le réseau (WAN, IP, uptime)", theme: "Thème",
        temperature_entity: "Température carte",
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
}
