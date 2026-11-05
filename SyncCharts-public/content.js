// Isolated-world bridge between the TradingView page and the extension worker.
(() => {
  if (window.__syncChartsContent0210Loaded) return;
  window.__syncChartsContent0210Loaded = true;

  const PAGE_SOURCE = "SYNCCHARTS_PAGE_0210";
  const EXT_SOURCE = "SYNCCHARTS_EXTENSION_0210";
  let pageStatus = { apiReady: false, paneCached: false, message: "Waiting for chart" };

  function sendTimeFormat(format) {
    window.postMessage({
      source: EXT_SOURCE,
      type: "SET_TIME_FORMAT",
      payload: { format: format === "24" ? "24" : "12" }
    }, location.origin);
  }

  chrome.storage.local.get({ syncChartsTimeFormat: "12" }).then(settings => {
    sendTimeFormat(settings.syncChartsTimeFormat);
  }).catch(() => sendTimeFormat("12"));

  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.source !== PAGE_SOURCE) return;

    if (data.type === "STATUS") {
      pageStatus = data.payload || pageStatus;
      return;
    }
    if (data.type === "ACTIVE") {
      chrome.runtime.sendMessage({ type: "SYNCCHARTS_ACTIVE_0210" }).catch(() => {});
      return;
    }
    if (data.type === "CROSSHAIR") {
      chrome.runtime.sendMessage({
        type: "SYNCCHARTS_CROSSHAIR_0210",
        timestamp: data.payload?.timestamp,
        index: data.payload?.index,
        yFraction: data.payload?.yFraction
      }).catch(() => {});
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "SYNCCHARTS_SET_TIME_FORMAT_0210") {
      sendTimeFormat(message.format);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "SYNCCHARTS_REMOTE_ACTIVE_0210") {
      window.postMessage({ source: EXT_SOURCE, type: "ACTIVE", payload: {} }, location.origin);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "SYNCCHARTS_APPLY_TIMESTAMP_0210") {
      window.postMessage({
        source: EXT_SOURCE,
        type: "APPLY_TIMESTAMP",
        payload: { timestamp: message.timestamp, yFraction: message.yFraction }
      }, location.origin);
      sendResponse({ ok: true });
      return;
    }

    if (message?.type === "SYNCCHARTS_IDENTIFY_TAB_0210") {
      sendResponse({
        connected: true,
        apiReady: !!pageStatus.apiReady,
        paneCached: !!pageStatus.paneCached,
        message: pageStatus.message
      });
    }
  });
})();
