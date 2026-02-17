(function widgetBootstrap() {
  const params = new URLSearchParams(window.location.search);
  const tenant = params.get("tenant") || "default";
  const isEmbedded = window.parent && window.parent !== window;

  const state = {
    history: [],
    calculationSummary: "",
    config: null,
    sessionId: null
  };
  const apiBase = new URL("../api/", window.location.href);

  const refs = {
    appRoot: document.getElementById("appRoot"),
    heroBrand: document.getElementById("heroBrand"),
    heroTitle: document.getElementById("heroTitle"),
    heroInfo: document.getElementById("heroInfo"),
    heroPill1: document.getElementById("heroPill1"),
    heroPill3: document.getElementById("heroPill3"),
    headerTitle: document.getElementById("headerTitle"),
    headerSub: document.getElementById("headerSub"),
    messages: document.getElementById("messages"),
    chatForm: document.getElementById("chatForm"),
    chatInput: document.getElementById("chatInput"),
    closeBtn: document.getElementById("closeBtn"),
    toggleCalc: document.getElementById("toggleCalc"),
    calcPanel: document.getElementById("calcPanel"),
    runCalc: document.getElementById("runCalc")
  };

  function applyLayoutMode() {
    if (isEmbedded) {
      document.body.classList.add("embed-mode");
      refs.closeBtn.hidden = false;
      return;
    }

    document.body.classList.add("standalone-mode");
    refs.closeBtn.hidden = true;
  }

  function createSessionId() {
    return `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }

  function loadSessionId() {
    const key = `solar_chat_session_${tenant}`;
    const existing = window.localStorage.getItem(key);
    if (existing) {
      state.sessionId = existing;
      return;
    }

    const id = createSessionId();
    state.sessionId = id;
    window.localStorage.setItem(key, id);
  }

  async function api(path, options = {}) {
    const url = new URL(path.replace(/^\/+/, ""), apiBase);
    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || "Errore richiesta API");
    }

    return payload;
  }

  function addMessage(role, text) {
    const el = document.createElement("div");
    el.className = `msg ${role === "user" ? "user" : "bot"}`;
    el.textContent = text;
    refs.messages.appendChild(el);
    refs.messages.scrollTop = refs.messages.scrollHeight;
  }

  function setTheme(config) {
    const primary = config?.ui?.primaryColor || "#f39c12";
    const accent = config?.ui?.accentColor || "#2c3e50";
    refs.appRoot.style.setProperty("--primary", primary);
    refs.appRoot.style.setProperty("--accent", accent);

    const brandName = config?.brandName || "Consulente Fotovoltaico";
    const widgetTitle = config?.ui?.headerTitle || "Calcolatore EV + Fotovoltaico";
    const welcomeText =
      config?.ui?.welcome ||
      "Simula i risparmi EV + FV in meno di un minuto e ricevi risposte immediate sui prossimi passi.";

    refs.heroBrand.textContent = brandName;
    refs.heroTitle.textContent = widgetTitle;
    refs.heroInfo.textContent = welcomeText;
    refs.heroPill1.textContent = "Simulazione in 60 sec";
    refs.heroPill3.textContent = config?.ui?.ctaLabel || "Analisi personalizzata";

    refs.headerTitle.textContent = brandName;
    refs.headerSub.textContent = widgetTitle;
  }

  function populateOptions(config) {
    const cars = config?.options?.cars || {};
    const plantOutput = config?.options?.plantOutput || {};
    const packagePrices = config?.options?.packagePrices || {};

    const autoSelect = document.getElementById("autoKey");
    autoSelect.innerHTML = "";

    Object.entries(cars).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = value.nome;
      autoSelect.appendChild(option);
    });

    const impiantoSelect = document.getElementById("impianto");
    impiantoSelect.innerHTML = "";

    Object.keys(plantOutput).forEach((key) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${key}kW (${plantOutput[key]} kWh/anno)`;
      impiantoSelect.appendChild(option);
    });

    const packageSelect = document.getElementById("packageKey");
    Object.entries(packagePrices).forEach(([key, value]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${key.toUpperCase()} - ${Math.round(value)} EUR`;
      packageSelect.appendChild(option);
    });
  }

  function togglePanel(panel, forceState) {
    const isOpen = !panel.classList.contains("hidden");
    const shouldOpen = typeof forceState === "boolean" ? forceState : !isOpen;
    panel.classList.toggle("hidden", !shouldOpen);
  }

  function readCalculatorInputs() {
    return {
      tenant,
      sessionId: state.sessionId,
      autoKey: document.getElementById("autoKey").value,
      kmAnnui: document.getElementById("kmAnnui").value,
      consumoCustom: document.getElementById("consumoCustom").value,
      prezzoPubblico: document.getElementById("prezzoPubblico").value,
      impianto: document.getElementById("impianto").value,
      quotaEVdaFV: document.getElementById("quotaEVdaFV").value,
      prezzoReteCasa: document.getElementById("prezzoReteCasa").value,
      packageKey: document.getElementById("packageKey").value
    };
  }

  async function runCalculation() {
    try {
      const payload = readCalculatorInputs();
      const response = await api("calculate", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      state.calculationSummary = response.summary;
      addMessage("bot", `Ecco la tua simulazione:\n${response.summary}`);
      state.history.push({ role: "assistant", content: response.summary });
      togglePanel(refs.calcPanel, false);
    } catch (error) {
      addMessage("bot", `Errore calcolo: ${error.message}`);
    }
  }

  async function sendChatMessage(text) {
    addMessage("user", text);
    state.history.push({ role: "user", content: text });

    try {
      const response = await api("chat", {
        method: "POST",
        body: JSON.stringify({
          tenant,
          sessionId: state.sessionId,
          message: text,
          calculationSummary: state.calculationSummary,
          history: state.history.slice(-6)
        })
      });

      addMessage("bot", response.reply);
      state.history.push({ role: "assistant", content: response.reply });
    } catch (error) {
      addMessage("bot", `Errore chat: ${error.message}`);
    }
  }

  function bindEvents() {
    refs.chatForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const text = refs.chatInput.value.trim();
      if (!text) {
        return;
      }
      refs.chatInput.value = "";
      sendChatMessage(text);
    });

    refs.toggleCalc.addEventListener("click", function () {
      togglePanel(refs.calcPanel);
    });

    refs.runCalc.addEventListener("click", runCalculation);

    refs.closeBtn.addEventListener("click", function () {
      if (isEmbedded) {
        window.parent.postMessage({ type: "solar-chat-close" }, "*");
      }
    });
  }

  async function init() {
    applyLayoutMode();
    loadSessionId();
    bindEvents();

    try {
      const response = await api(`public/config?tenant=${encodeURIComponent(tenant)}`);
      state.config = response.config;
      setTheme(response.config);
      populateOptions(response.config);
      const openingQuestion =
        response.config?.ui?.openingQuestion ||
        "Perfetto, partiamo: quanti km percorri in un anno con la tua auto?";
      addMessage("bot", openingQuestion);
    } catch (error) {
      addMessage("bot", `Errore configurazione tenant: ${error.message}`);
    }
  }

  init();
})();
