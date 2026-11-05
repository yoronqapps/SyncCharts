# Changelog

## 0.2.11 — Interface and release preparation

- Reworked the popup with a monochrome black-and-white TradingView-inspired appearance.
- Simplified tab status wording and removed low-level canvas diagnostics from the user interface.
- Kept the existing synchronization engine and time-format preference behavior unchanged.
- Added public-facing README, privacy policy, and license files.

## 0.2.10 — Smoother crosshair updates

- Keeps the latest pointer position received before each animation frame.
- Coalesces source pointer updates to animation frames.
- Applies incoming BroadcastChannel updates immediately on receiving charts to reduce scheduling latency.
- Caches the main chart canvas bounds and invalidates the cache on layout changes.
- Uses a finer vertical movement threshold.
