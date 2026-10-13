(() => {
  "use strict";

  const LANGUAGES = [
    ["hi", "Hindi"], ["bn", "Bengali"], ["sa", "Sanskrit"],
    ["ta", "Tamil"], ["te", "Telugu"], ["mr", "Marathi"],
    ["gu", "Gujarati"], ["en", "English"], ["es", "Spanish"],
    ["fr", "French"]
  ];

  function addTranslateControl() {
    if (document.getElementById("pyf-translate")) return;

    const style = document.createElement("style");
    style.textContent = `
      #pyf-translate {
        position: fixed; right: 18px; bottom: 18px; z-index: 9999;
        display: flex; align-items: center; gap: 8px; padding: 10px 12px;
        color: #fff; background: #101b2d; border: 1px solid #526078;
        border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,.22);
        font: 14px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      #pyf-translate label { white-space: nowrap; }
      #pyf-translate select, #pyf-translate button {
        min-height: 36px; border-radius: 7px; font: inherit;
      }
      #pyf-translate select {
        max-width: 145px; padding: 5px 7px; color: #101b2d;
        background: #fff; border: 1px solid #c8ced8;
      }
      #pyf-translate button {
        padding: 6px 10px; border: 0; background: #e7bd72;
        color: #101b2d; cursor: pointer; font-weight: 600;
      }
      #pyf-translate button:focus-visible,
      #pyf-translate select:focus-visible {
        outline: 3px solid #7db5ff; outline-offset: 2px;
      }
      @media (max-width: 480px) {
        #pyf-translate {
          right: 10px; bottom: 10px; gap: 6px; padding: 8px;
          max-width: calc(100vw - 20px);
        }
        #pyf-translate select { max-width: 112px; }
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = "pyf-translate";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Translate this page");

    const label = document.createElement("label");
    label.htmlFor = "pyf-translate-language";
    label.textContent = "🌐 Translate";

    const select = document.createElement("select");
    select.id = "pyf-translate-language";
    select.setAttribute("aria-label", "Choose translation language");

    LANGUAGES.forEach(([code, name]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      select.appendChild(option);
    });

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Translate";
    button.setAttribute("aria-label", "Translate this page with Google");

    button.addEventListener("click", () => {
      const pageUrl = window.location.href;

      if (!/^https?:$/.test(window.location.protocol) ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1") {
        window.alert("Please test translation on the published https://protectyourselffoundation.in website. Google Translate needs a public webpage URL.");
        return;
      }

      if (select.value === "en") {
        window.location.reload();
        return;
      }

      // Open Google Translate's website-translation interface with this page URL.
      const translateUrl = new URL("https://translate.google.com/translate");
      translateUrl.searchParams.set("sl", "auto");
      translateUrl.searchParams.set("tl", select.value);
      translateUrl.searchParams.set("u", pageUrl);
      window.open(translateUrl.href, "_blank", "noopener,noreferrer");
    });

    panel.append(label, select, button);
    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addTranslateControl, { once: true });
  } else {
    addTranslateControl();
  }
})();
