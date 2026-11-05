// SyncCharts page-world bridge. TradingViewApi is private and may change.
(() => {
  if (window.__syncCharts0210Loaded) return;
  window.__syncCharts0210Loaded = true;

  const CHANNEL = "SYNCCHARTS_PAGE_0210";
  const BROADCAST = "synccharts-tv-crosshair-v0210";
  let cachedParts = [];
  let cachedCollection = null;
  let cachedApi = null;
  let lastSentTimestamp = null;
  let lastSentYFraction = NaN;
  let lastPane = null;
  let lastPrice = NaN;
  let moveQueued = false;
  let pendingSourceYFraction = NaN;
  let syncChannel = null;
  let lastPointerAt = 0;
  let use12HourTime = true;
  let lastDisplayedTime = null;
  // True while this tab owns the live pointer/crosshair. In that case TradingView's native time-axis label is preferred and our duplicate badge stays hidden.
  let localOwnsCrosshair = false;

  // Cache the plot canvas bounds. Querying every canvas and measuring layout
  // on every raw pointer event is unnecessarily expensive during fast moves.
  let primaryCanvasRectCache = null;
  let primaryCanvasRectDirty = true;
  let canvasResizeObserver = null;

  const pageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    syncChannel = new BroadcastChannel(BROADCAST);
    syncChannel.addEventListener("message", event => {
      const data = event.data;
      if (!data || data.source === pageId) return;
      if (data.type === "ACTIVE") {
        localOwnsCrosshair = false;
        return;
      }
      if (data.type !== "CROSSHAIR") return;
      const timestamp = Number(data.timestamp);
      const yFraction = data.yFraction;
      if (Number.isFinite(timestamp) && timestamp > 0) queueApply(timestamp, yFraction);
    });
  } catch {
    syncChannel = null;
  }

  function emit(type, payload = {}) {
    window.postMessage({ source: CHANNEL, type, payload }, location.origin);
  }

  function refreshParts() {
    try {
      const api = window.TradingViewApi;
      const collection = api?._chartWidgetCollection?._chartModels?._value;
      if (!Array.isArray(collection)) {
        cachedApi = api || null;
        cachedCollection = collection || null;
        cachedParts = [];
        return cachedParts;
      }
      cachedApi = api;
      cachedCollection = collection;
      cachedParts = collection.map(item => {
        const model = item?.m_model || item;
        if (!model) return null;
        try {
          const timeScale = model.timeScale?.();
          const crosshair = model.crosshairSource?.();
          const series = model.mainSeries?.();
          return timeScale && crosshair && series
            ? { model, timeScale, crosshair, series }
            : null;
        } catch { return null; }
      }).filter(Boolean);
    } catch { cachedParts = []; }
    return cachedParts;
  }

  function getActiveParts() {
    const api = window.TradingViewApi;
    const collection = api?._chartWidgetCollection?._chartModels?._value;
    if (api !== cachedApi || collection !== cachedCollection || !cachedParts.length) {
      refreshParts();
    }
    return cachedParts.find(p => Number.isFinite(Number(p.crosshair.appliedIndex?.())) && p.crosshair.pane) ||
      cachedParts.find(p => Number.isFinite(Number(p.crosshair.appliedIndex?.()))) ||
      cachedParts[0] || null;
  }

  // TradingView draws its plot in one or more canvases. Use the largest visible
  // plot canvas as a common coordinate frame in each tab, then sync the pointer's
  // relative height rather than copying a price between different instruments.
  function invalidatePrimaryCanvasRect() {
    primaryCanvasRectDirty = true;
  }

  function getPrimaryCanvasRect() {
    if (!primaryCanvasRectDirty && primaryCanvasRectCache) {
      return primaryCanvasRectCache;
    }

    const canvases = [...document.querySelectorAll("canvas")].filter(canvas => {
      if (!canvas.isConnected || canvas.width <= 80 || canvas.height <= 80) return false;
      const rect = canvas.getBoundingClientRect();
      return rect.width > 80 && rect.height > 80;
    });
    canvases.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    });

    const primaryCanvas = canvases[0] || null;
    primaryCanvasRectCache = primaryCanvas?.getBoundingClientRect() || null;
    primaryCanvasRectDirty = false;

    if (canvasResizeObserver) canvasResizeObserver.disconnect();
    if (primaryCanvas && canvasResizeObserver) canvasResizeObserver.observe(primaryCanvas);
    return primaryCanvasRectCache;
  }

  canvasResizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(invalidatePrimaryCanvasRect)
    : null;
  window.addEventListener("resize", invalidatePrimaryCanvasRect, { passive: true });
  window.addEventListener("scroll", invalidatePrimaryCanvasRect, { capture: true, passive: true });
  if (typeof MutationObserver === "function" && document.documentElement) {
    const canvasMutationObserver = new MutationObserver(invalidatePrimaryCanvasRect);
    canvasMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function pointerYFraction(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
    const onChartCanvas = path.some(node => node instanceof HTMLCanvasElement &&
      node.width > 80 && node.height > 80 && node.isConnected);
    if (!onChartCanvas) return NaN;
    const rect = getPrimaryCanvasRect();
    if (!rect || rect.height <= 0) return NaN;
    return Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
  }

  function reportReady() {
    const parts = getActiveParts();
    emit("STATUS", {
      apiReady: !!parts,
      modelCount: cachedParts.length,
      canvasCount: document.querySelectorAll("canvas").length,
      paneCached: !!lastPane,
      message: parts ? "TradingView chart API detected" : "Waiting for TradingView chart API"
    });
    return !!parts;
  }

  function hideSyncedTime() {
    if (syncTimeBadge?.isConnected) syncTimeBadge.style.display = "none";
  }

  function handlePointerMove(event) {
    const yFraction = pointerYFraction(event);
    if (!Number.isFinite(yFraction)) return;
    // The chart under the real pointer should use TradingView's native time label.
    // Tell other tabs that this chart now owns the crosshair.
    if (!localOwnsCrosshair) {
      localOwnsCrosshair = true;
      hideSyncedTime();
      if (syncChannel) {
        syncChannel.postMessage({ type: "ACTIVE", source: pageId });
      } else {
        emit("ACTIVE", {});
      }
    }
    // Keep the newest pointer position even when several pointer events arrive
    // before the next paint. Previously the first event in each frame won,
    // making the remote crosshair trail behind during fast mouse movement.
    pendingSourceYFraction = yFraction;
    if (moveQueued) return;
    moveQueued = true;
    requestAnimationFrame(() => {
      moveQueued = false;
      const latestYFraction = pendingSourceYFraction;
      pendingSourceYFraction = NaN;
      const parts = getActiveParts();
      if (!parts) return;
      const { timeScale, crosshair } = parts;
      const index = Number(crosshair.appliedIndex?.());
      const price = Number(crosshair.price);
      const pane = crosshair.pane;
      if (pane && Number.isFinite(price)) {
        lastPane = pane;
        lastPrice = price;
      }
      if (!Number.isFinite(index)) return;
      let timestamp;
      try { timestamp = Number(timeScale.indexToTimePoint(index)); } catch { return; }
      if (!Number.isFinite(timestamp) || timestamp <= 0) return;
      // A candle timestamp can stay constant while the pointer moves vertically.
      // Send those changes too, otherwise the horizontal line would appear frozen.
      const yChanged = !Number.isFinite(lastSentYFraction) ||
        Math.abs(latestYFraction - lastSentYFraction) >= 0.0005;
      if (timestamp === lastSentTimestamp && !yChanged) return;
      lastSentTimestamp = timestamp;
      lastSentYFraction = latestYFraction;
      lastPointerAt = performance.now();
      if (syncChannel) {
        syncChannel.postMessage({ type: "CROSSHAIR", source: pageId, timestamp, yFraction: latestYFraction });
      } else {
        emit("CROSSHAIR", { timestamp, index, yFraction: latestYFraction });
      }
    });
  }

  // The sender already batches pointer events to one update per animation
  // frame. Apply each received update immediately instead of waiting for a
  // second animation frame in this window, which added avoidable latency.
  function queueApply(timestamp, yFraction = NaN) {
    const normalizedY = yFraction !== null && yFraction !== undefined &&
      Number.isFinite(Number(yFraction))
      ? Math.max(0, Math.min(1, Number(yFraction))) : NaN;
    if (Number.isFinite(timestamp)) applyTimestamp(timestamp, normalizedY);
  }

  // A SyncCharts-owned time badge supplements TradingView's native axis badge.
  // The native badge can be suppressed when another browser window owns focus.
  let syncTimeBadge = null;
  function ensureTimeBadge() {
    if (syncTimeBadge?.isConnected) return syncTimeBadge;
    const badge = document.createElement("div");
    badge.id = "synccharts-synced-time-0210";
    badge.setAttribute("aria-hidden", "true");
    Object.assign(badge.style, {
      position: "fixed",
      zIndex: "2147483647",
      display: "none",
      pointerEvents: "none",
      transform: "translateX(-50%)",
      padding: "4px 7px",
      borderRadius: "3px",
      border: "1px solid #434651",
      background: "#2a2e39",
      color: "#d1d4dc",
      font: "12px/16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      fontWeight: "600",
      whiteSpace: "nowrap",
      boxShadow: "0 1px 4px rgba(0,0,0,.35)"
    });
    (document.body || document.documentElement).appendChild(badge);
    syncTimeBadge = badge;
    return badge;
  }

  function formatSyncedTime(model, timeScale, index, timestamp) {
    // indexToUserTime() can return a Date whose wall-clock interpretation is
    // ambiguous outside TradingView's own renderer. The candle timestamp is
    // an absolute Unix time; format it directly in the chart's IANA timezone.
    const date = new Date(Number(timestamp) * 1000);
    if (Number.isNaN(date.getTime())) return "";

    let timeZone = null;
    try {
      const candidate = model.timezone?.();
      if (typeof candidate === "string" && candidate && candidate !== "exchange") {
        timeZone = candidate;
      }
    } catch {}

    const options = {
      year: "numeric", month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: use12HourTime
    };
    if (timeZone) options.timeZone = timeZone;
    try {
      return new Intl.DateTimeFormat("en-US", options).format(date);
    } catch {
      // Do not silently pretend the browser timezone is the chart timezone.
      // Show an explicit UTC fallback if TradingView's timezone is unavailable.
      return new Intl.DateTimeFormat("en-US", {
        ...options, timeZone: "UTC", timeZoneName: "short"
      }).format(date);
    }
  }

  function showSyncedTime(model, timeScale, index, timestamp, x) {
    // Never place an extension badge over the chart currently controlled by
    // the pointer; TradingView already displays its native time label there.
    if (localOwnsCrosshair) {
      hideSyncedTime();
      return;
    }
    try {
      const badge = ensureTimeBadge();
      const rect = getPrimaryCanvasRect();
      if (!rect) return;
      const left = Math.max(8, Math.min(window.innerWidth - 8, rect.left + Number(x)));
      lastDisplayedTime = { model, timeScale, index, timestamp };
      badge.textContent = formatSyncedTime(model, timeScale, index, timestamp);
      badge.style.left = `${left}px`;
      // Keep the label in the chart's bottom time-axis region.
      badge.style.top = `${Math.max(4, window.innerHeight - 34)}px`;
      badge.style.display = "block";
    } catch {}
  }

  function priceAtRelativeHeight(pane, yFraction) {
    if (!pane || !Number.isFinite(yFraction)) return NaN;
    try {
      const scale = pane.defaultPriceScale?.();
      if (!scale || typeof scale.coordinateToPrice !== "function") return NaN;
      const rect = getPrimaryCanvasRect();
      const paneHeight = Number(typeof pane.height === "function" ? pane.height() : pane.height) || rect?.height;
      const paneTop = Number(typeof pane.top === "function" ? pane.top() : pane.top) || 0;
      if (!Number.isFinite(paneHeight) || paneHeight <= 0) return NaN;
      const targetY = paneTop + Math.max(0, Math.min(1, yFraction)) * paneHeight;
      const value = Number(scale.coordinateToPrice(targetY));
      return Number.isFinite(value) ? value : NaN;
    } catch { return NaN; }
  }

  function applyTimestamp(timestamp, yFraction = NaN) {
    const parts = getActiveParts();
    if (!parts) {
      emit("APPLY_RESULT", { ok: false, reason: "TradingView chart API is not ready" });
      return;
    }

    const { model, timeScale, crosshair } = parts;
    let index;
    try { index = Number(timeScale.timePointToIndex(Number(timestamp))); } catch { index = NaN; }
    if (!Number.isFinite(index)) {
      emit("APPLY_RESULT", { ok: false, timestamp, reason: "No matching candle is available in this chart" });
      return;
    }

    // Keep the receiving chart's own price and pane. Never copy prices
    // between different instruments. Its cached price is refreshed by local hover.
    const pane = crosshair.pane || lastPane;
    // Convert the source chart's relative pointer height into a price on this
    // chart's own scale. Never copy NAS100's/US500's absolute price to the other.
    const relativePrice = priceAtRelativeHeight(pane, yFraction);
    const price = Number.isFinite(relativePrice)
      ? relativePrice
      : (Number.isFinite(lastPrice) ? lastPrice : Number(crosshair.price));
    if (!pane || !Number.isFinite(price)) {
      emit("APPLY_RESULT", {
        ok: false, timestamp, index,
        reason: "Move the pointer over this chart once to initialize its price pane"
      });
      return;
    }

    try {
      // TradingView normally shows the bottom-axis date badge only while its
      // chart widget is considered hovered. Ask the private crosshair source
      // to keep that state active for this programmatic position as well.
      try { crosshair.setOnHoveredChartWidget?.(true); } catch {}
      crosshair.setPosition(index, price, pane);
      // Force TradingView's native crosshair/time-axis views to refresh.
      try { crosshair.updateAllViews?.(); } catch {}

      let x = NaN;
      try { x = Number(timeScale.indexToCoordinate(index)); } catch {}
      if (!Number.isFinite(x)) {
        try { x = Number(timeScale.timeToCoordinate(timeScale.indexToTimePoint(index))); } catch {}
      }
      // Show a persistent, extension-owned date/time label on the receiving chart.
      // Use the target chart's resolved candle time, not the source chart's clock text.
      let targetTimestamp = Number(timestamp);
      try {
        const actual = Number(timeScale.indexToTimePoint(index));
        if (Number.isFinite(actual) && actual > 0) targetTimestamp = actual;
      } catch {}
      if (Number.isFinite(x)) showSyncedTime(model, timeScale, index, targetTimestamp, x);

      emit("APPLY_RESULT", {
        ok: true, timestamp: targetTimestamp, index, x,
        horizontalSynced: Number.isFinite(relativePrice),
        yFraction: Number.isFinite(yFraction) ? yFraction : null,
        reason: Number.isFinite(relativePrice)
          ? "Vertical and horizontal crosshair synchronized"
          : "Vertical crosshair synchronized; horizontal position used local fallback"
      });
    } catch (error) {
      emit("APPLY_RESULT", { ok: false, timestamp, index, reason: String(error?.message || error) });
    }
  }

  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.source !== "SYNCCHARTS_EXTENSION_0210") return;
    if (event.data.type === "SET_TIME_FORMAT") {
      use12HourTime = event.data.payload?.format !== "24";
      if (lastDisplayedTime) {
        const { model, timeScale, index, timestamp } = lastDisplayedTime;
        const badge = ensureTimeBadge();
        badge.textContent = formatSyncedTime(model, timeScale, index, timestamp);
      }
    }
    if (event.data.type === "ACTIVE") {
      localOwnsCrosshair = true;
      hideSyncedTime();
    }
    if (event.data.type === "APPLY_TIMESTAMP") {
      const timestamp = Number(event.data.payload?.timestamp);
      const yFraction = event.data.payload?.yFraction;
      if (Number.isFinite(timestamp) && timestamp > 0) queueApply(timestamp, yFraction);
    }
  });

  document.addEventListener("pointermove", handlePointerMove, { capture: true, passive: true });

  // Cache chart internals once, then refresh occasionally in case the user
  // changes layouts/symbols and TradingView replaces its chart model.
  refreshParts();
  let checks = 0;
  const readyTimer = setInterval(() => {
    checks += 1;
    if (reportReady() || checks >= 30) clearInterval(readyTimer);
  }, 500);
  setInterval(() => refreshParts(), 2000);
  setTimeout(reportReady, 1200);
})();
