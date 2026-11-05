// Relay candle timestamps between TradingView tabs. Programmatic crosshair
// updates do not generate pointer events, so they do not create a feedback loop.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SYNCCHARTS_ACTIVE_0210") {
    const sourceTabId = sender.tab?.id;
    chrome.tabs.query({ url: ["https://www.tradingview.com/*"] }, tabs => {
      for (const tab of tabs) {
        if (tab.id == null || tab.id === sourceTabId) continue;
        chrome.tabs.sendMessage(tab.id, { type: "SYNCCHARTS_REMOTE_ACTIVE_0210" }).catch(() => {});
      }
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "SYNCCHARTS_CROSSHAIR_0210") {
    const sourceTabId = sender.tab?.id;
    const timestamp = Number(message.timestamp);
    if (sourceTabId == null || !Number.isFinite(timestamp) || timestamp <= 0) {
      sendResponse?.({ ok: false });
      return;
    }

    chrome.tabs.query({ url: ["https://www.tradingview.com/*"] }, tabs => {
      const targets = tabs.filter(tab => tab.id != null && tab.id !== sourceTabId);
      for (const tab of targets) {
        chrome.tabs.sendMessage(tab.id, {
          type: "SYNCCHARTS_APPLY_TIMESTAMP_0210",
          timestamp,
          yFraction: message.yFraction != null && Number.isFinite(Number(message.yFraction))
            ? Number(message.yFraction) : null
        }).catch(() => {});
      }
      sendResponse({ ok: true, targets: targets.length });
    });
    return true;
  }

  if (message?.type === "SYNCCHARTS_CHECK_TABS_0210") {
    chrome.tabs.query({ url: ["https://www.tradingview.com/*"] }, async tabs => {
      const results = await Promise.all(tabs.map(async tab => {
        try {
          const status = await chrome.tabs.sendMessage(tab.id, { type: "SYNCCHARTS_IDENTIFY_TAB_0210" });
          return { tabId: tab.id, title: tab.title || "TradingView", ...status };
        } catch {
          return { tabId: tab.id, title: tab.title || "TradingView", connected: false,
            apiReady: false, paneCached: false, message: "Reload this TradingView tab" };
        }
      }));
      sendResponse({ ok: true, results });
    });
    return true;
  }
});
