# SyncCharts

**Synchronize TradingView crosshairs between separate browser tabs.**

SyncCharts synchronizes crosshairs between independent TradingView tabs by matching candle timestamps. It supports different symbols and timeframes, including both vertical and horizontal crosshair positioning.

## Features

- Synchronizes crosshairs between separate TradingView tabs.
- Matches candles by timestamp, not screen coordinates.
- Supports different symbols and timeframes.
- Synchronizes vertical and horizontal crosshair positioning.
- Maps horizontal positioning to each chart's own price scale.
- Displays synchronized candle time using the chart's timezone.
- Supports 12-hour and 24-hour time formats.
- Uses local browser communication; no SyncCharts account or cloud server is required.

## Installation (Brave)

1. Download the latest ZIP from [GitHub Releases](https://github.com/yoronqapps/SyncCharts/releases).
2. Extract the ZIP.
3. Open `brave://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.
7. Open your TradingView tabs and hover over each chart once.

## Compatibility Notice

SyncCharts currently relies on private TradingView page APIs. TradingView updates may change these APIs and affect compatibility.

SyncCharts is an independent project and is not affiliated with, endorsed by, or sponsored by TradingView.

## Privacy

SyncCharts does not operate a cloud server or collect analytics. Synchronization data is exchanged locally between browser tabs.

See [PRIVACY.md](SyncCharts-public/PRIVACY.md) for details.

## Source Code

The extension source code and documentation are currently located in the [`SyncCharts-public`](SyncCharts-public/) folder.

## License

[MIT License](SyncCharts-public/LICENSE)
