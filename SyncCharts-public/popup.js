const summary = document.getElementById("summary");
const resultsBox = document.getElementById("results");
const timeFormat = document.getElementById("timeFormat");

async function applyTimeFormat(value) {
  const normalized = value === "24" ? "24" : "12";
  await chrome.storage.local.set({ syncChartsTimeFormat: normalized });
  const tabs = await chrome.tabs.query({ url: ["https://www.tradingview.com/*"] });
  await Promise.all(tabs.filter(tab => tab.id != null).map(tab =>
    chrome.tabs.sendMessage(tab.id, {
      type: "SYNCCHARTS_SET_TIME_FORMAT_0210", format: normalized
    }).catch(() => {})
  ));
}

chrome.storage.local.get({ syncChartsTimeFormat: "12" }).then(settings => {
  timeFormat.value = settings.syncChartsTimeFormat === "24" ? "24" : "12";
});
timeFormat.addEventListener("change", () => applyTimeFormat(timeFormat.value));

function addLine(card, text, className = "") {
  const line = document.createElement("span");
  if (className) line.className = className;
  line.textContent = text;
  card.append(line);
}

function render(results) {
  resultsBox.replaceChildren();
  const readyCount = results.filter(tab => tab.connected && tab.apiReady).length;
  summary.textContent = results.length
    ? `${readyCount} of ${results.length} TradingView tabs ready.`
    : "No open TradingView tabs found.";

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Open TradingView in a tab to get started.";
    resultsBox.append(empty);
    return;
  }

  for (const item of results) {
    const card = document.createElement("div");
    card.className = "tab";

    const title = document.createElement("strong");
    title.textContent = item.title || "TradingView chart";
    card.append(title);

    if (!item.connected) {
      addLine(card, item.message || "Reload this TradingView tab", "warn");
    } else if (!item.apiReady) {
      addLine(card, "Waiting for the chart to finish loading", "warn");
    } else {
      addLine(card, "Connected · chart ready", "good");
      if (!item.paneCached) {
        addLine(card, "Move your pointer over this chart once to initialize it");
      }
    }
    resultsBox.append(card);
  }
}

async function checkTabs() {
  summary.textContent = "Checking open tabs…";
  resultsBox.replaceChildren();
  try {
    const response = await chrome.runtime.sendMessage({ type: "SYNCCHARTS_CHECK_TABS_0210" });
    if (!response?.ok || !Array.isArray(response.results)) throw new Error("No response");
    render(response.results);
  } catch {
    summary.textContent = "Could not check tabs. Reload the extension and TradingView tabs.";
  }
}

document.getElementById("check").addEventListener("click", checkTabs);
checkTabs();
