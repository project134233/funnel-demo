(function solarChatEmbed() {
  if (window.__solarChatWidgetMounted) {
    return;
  }
  window.__solarChatWidgetMounted = true;

  const script = document.currentScript;
  if (!script) {
    return;
  }

  const tenant = script.dataset.tenant || "default";
  const buttonLabel = script.dataset.label || "Consulente FV";
  const position = script.dataset.position === "left" ? "left" : "right";
  const primaryColor = script.dataset.primaryColor || "#f39c12";

  const scriptUrl = new URL(script.src, window.location.href);
  const basePath = scriptUrl.pathname.replace(/\/[^/]+$/, "");
  const baseUrl = `${scriptUrl.origin}${basePath}`;

  const iframeSrc = `${baseUrl}/widget/index.html?tenant=${encodeURIComponent(tenant)}`;

  const style = document.createElement("style");
  style.textContent = `
    .solar-chat-launcher {
      position: fixed;
      ${position}: 24px;
      bottom: 24px;
      z-index: 2147483000;
      border: none;
      border-radius: 999px;
      background: ${primaryColor};
      color: #fff;
      font: 600 14px/1.2 Arial, sans-serif;
      padding: 12px 16px;
      cursor: pointer;
      box-shadow: 0 10px 24px rgba(0,0,0,0.2);
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    .solar-chat-panel {
      position: fixed;
      ${position}: 24px;
      bottom: 78px;
      width: min(420px, calc(100vw - 24px));
      height: min(720px, calc(100vh - 110px));
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 18px 48px rgba(0,0,0,0.25);
      background: #fff;
      z-index: 2147483000;
      display: none;
    }
    .solar-chat-panel.open {
      display: block;
    }
    .solar-chat-frame {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    @media (max-width: 640px) {
      .solar-chat-panel {
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100dvh;
        border-radius: 0;
      }
      .solar-chat-launcher {
        ${position}: 16px;
        bottom: 16px;
      }
      .solar-chat-launcher.is-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(10px);
      }
    }
  `;

  document.head.appendChild(style);

  const launcher = document.createElement("button");
  launcher.className = "solar-chat-launcher";
  launcher.type = "button";
  launcher.textContent = buttonLabel;

  const panel = document.createElement("div");
  panel.className = "solar-chat-panel";

  const iframe = document.createElement("iframe");
  iframe.className = "solar-chat-frame";
  iframe.title = "Solar Chat Widget";
  iframe.src = iframeSrc;

  panel.appendChild(iframe);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  function toggle(forceOpen) {
    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !panel.classList.contains("open");
    panel.classList.toggle("open", shouldOpen);
    launcher.textContent = shouldOpen ? "Chiudi" : buttonLabel;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    launcher.classList.toggle("is-hidden", shouldOpen && isMobile);
  }

  launcher.addEventListener("click", function () {
    toggle();
  });

  window.addEventListener("message", function (event) {
    if (event.source !== iframe.contentWindow || !event.data) {
      return;
    }

    if (event.data.type === "solar-chat-close") {
      toggle(false);
    }

    if (event.data.type === "solar-chat-open") {
      toggle(true);
    }
  });
})();
