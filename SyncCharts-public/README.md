# SyncCharts

**Synchronize TradingView crosshairs between separate browser tabs.**

SyncCharts matches candles by timestamp, so charts can use different symbols and timeframes. It synchronizes both vertical and horizontal crosshair positioning; the receiving chart uses its own price scale rather than copying prices between instruments.

> **Experimental compatibility:** SyncCharts relies on private TradingView page APIs, which are not a stable public interface. TradingView updates may change or break compatibility. SyncCharts is an independent community project and is not affiliated with, endorsed by, or sponsored by TradingView.

## Features

- Synchronizes crosshairs between independent TradingView tabs.
- Matches candle timestamps rather than screen coordinates, supporting different symbols and timeframes.
- Synchronizes vertical and horizontal crosshair lines.
- Maps horizontal position to each chart's own price scale.
- Displays synchronized candle time in the receiving chart's selected timezone.
- Supports 12-hour and 24-hour time labels.
- Exchanges messages locally between tabs; no SyncCharts account, cloud service, or external server is used.

## Install in Brave

1. Download the ZIP from the [GitHub Releases](../../releases) page and extract it.
2. Open `brave://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the extracted `SyncCharts` folder containing `manifest.json`.
5. Open or reload your TradingView chart tabs.
6. Hover over each chart once so SyncCharts can initialize its chart pane.
7. Open the SyncCharts toolbar popup to check tab status and choose a 12-hour or 24-hour time label.

To update an unpacked installation, extract the new release, load the new folder, and reload TradingView tabs. Remove the previous unpacked extension entry if Brave reports a duplicate or if you are replacing its folder.

## How it works

The source chart provides the hovered candle timestamp and the pointer's relative vertical position. SyncCharts sends that information to other open TradingView tabs. Each receiving chart finds the matching timestamp in its own loaded chart data and maps the relative vertical position onto its own price scale.

## Privacy

SyncCharts does not require an account and does not send synchronization data to a SyncCharts-operated server. Synchronization messages are exchanged between TradingView tabs in the local browser. The selected time-label format is stored in local browser extension storage. See [PRIVACY.md](PRIVACY.md).

## Permissions

- `tabs`: identify open TradingView tabs and message them.
- `storage`: remember the selected time-label format.
- `https://www.tradingview.com/*`: run the extension scripts only on TradingView pages.

## Known limitations

- Private TradingView internals may change without notice.
- A receiving chart can position its crosshair only when the corresponding candle/time point is available in its loaded chart data.
- The synchronized time badge is provided by SyncCharts; it is not TradingView's native axis label.
- Horizontal position is relative to each chart's plot area and uses that chart's own price scale. It is not a shared absolute price across symbols.
- Brave is the primary tested browser; other Chromium-based browsers with Manifest V3 support may work but are not guaranteed.

## Development

The extension is dependency-free. Validate JavaScript syntax with:

```sh
for file in background.js content.js page-main.js popup.js; do node --check "$file"; done
```

Load the project folder through `brave://extensions` with Developer mode enabled to test changes.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
