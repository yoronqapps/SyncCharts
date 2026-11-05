# Contributing to SyncCharts

Thanks for your interest in improving SyncCharts.

## Before opening an issue

- Check whether the issue is reproducible in the latest release.
- Include your browser version, operating system, TradingView chart timezone, symbols, and timeframes.
- Describe the exact steps to reproduce the behavior.
- Do not include account credentials, private chart links, or sensitive trading information.

## Changes

- Keep the extension dependency-free unless a dependency is clearly necessary.
- Preserve timestamp-based synchronization and avoid copying absolute prices between different symbols.
- Test both synchronization directions and different chart timeframes.
- Run `node --check` on all JavaScript files before submitting changes.
- Update the README and CHANGELOG when behavior or user-facing features change.

## Pull requests

Keep pull requests focused and explain what changed, why it changed, and how it was tested.
