# MakerWorld Multi-Project Filament Purchase Calculator

An MVP tool for pre-purchase planning before 3D printing: paste multiple MakerWorld model links, choose the print profiles you plan to use, aggregate filament colors and weights, then map them to a Bambu Lab filament catalog to generate a purchase list.

> Independent open source project under AGPL-3.0-or-later. Not affiliated with, endorsed by, sponsored by, or officially connected to MakerWorld or Bambu Lab.

Live demo: https://makerworld-filament-planner.onrender.com/

## Features

- Resolve multiple MakerWorld model links in one workflow.
- Supports both `makerworld.com.cn` and `makerworld.com`.
- Supports selecting a profile from the URL hash, for example `#profileId-2219446`.
- Aggregates filament colors, material types, lengths, and grams across multiple models.
- Helps select compatible profiles based on a target printer.
- Maps model colors to common Bambu Lab filament catalog entries.
- Supports owned stock, safety buffer, AMS extra buffer, and grams-per-roll settings.
- Supports copying the purchase list, exporting CSV, and opening Bambu store links.
- Supports Chinese and English UI, with preferences stored in the current browser.

## Quick Start

```bash
npm install
npm run dev
```

After the dev server starts, open the local URL printed in the terminal.

Build and verify:

```bash
npm run check
```

## Architecture

- Frontend: Vite + React + TypeScript.
- Backend: Express, used to resolve `/api/resolve` requests and fetch public MakerWorld profile metadata.
- Data storage: the current plan, language preference, and help dialog state are stored in browser localStorage.
- Build output: `npm run build` creates `dist/`; `npm run preview` serves the built app through the Express server.

## Usage

1. Paste MakerWorld model links on the "Model links" page. Sample links are prefilled and can be replaced.
2. Click "Resolve links" to load public print profiles and filament usage for each model.
3. On the "Print profiles" page, choose whether each project is included in the purchase plan and confirm the profile to use.
4. Optionally choose a target printer and click "Auto-select matching profiles". The tool will replace current selections by compatibility, but slicer verification is still recommended.
5. On the "Color merge" page, review how raw model colors map to purchase colors. Green is usually ready, yellow should be reviewed, and red must be confirmed before buying.
6. On the "Purchase list" page, enter owned stock, grams per roll, and safety buffers, then copy the list, export CSV, or open Bambu store links.

The first visit shows a help dialog covering inputs, review points, outputs, and local saving. After confirmation, it will not open automatically again. You can reopen it from the bottom-right "Help" button. The bottom-right "About" button includes the version, open source notice, and purchase risk reminder. The current plan is stored in browser localStorage so you can resume it later; use "Clear current plan" on the "Model links" page to start over.

The language switcher in the top-right corner toggles between Chinese and English. The language preference is also stored in the current browser.

## Supported Links

- One MakerWorld model link per line.
- Supports `makerworld.com.cn` and `makerworld.com`.
- Supports appending `#profileId-xxxx` to select a print profile.

Example:

```text
https://makerworld.com.cn/zh/models/2004043-chao-ji-ma-li-ao-ma-jiang-144zhang-dan-se-huo-duo
https://makerworld.com.cn/zh/models/1993223-zi-mu-ma-jiang-xiao-peng-you-chao-ai-wan-de-pin-ci#profileId-2219446
```

## Data Sources

- Model, profile, color, and usage data come from public MakerWorld pages or API responses.
- Filament products, SKUs, and purchase links come from the built-in Bambu Lab catalog mapping.
- This tool does not guarantee third-party data completeness, accuracy, availability, stock status, pricing, shipping region, or product variants.

## Purchase List Notes

- Raw usage comes from the selected print profile's filament statistics.
- "With buffer" is calculated from the safety buffer percentage. If AMS extra buffer is configured, it is only added to grams affected by AMS or multicolor profiles.
- "Owned stock" is entered in rolls, supports decimals such as `0.5`, and is converted to grams using the configured grams-per-roll value.
- Bambu cart links currently point to the Bambu Lab US store.
- Each color row shows SKU, raw usage, AMS-affected usage, buffered usage, owned stock, suggested roll count, and purchase link.

## Known Limitations

- Color mapping includes automatic estimates. Exact matches and alias matches are lower risk; family estimates need human review; unmatched colors must be confirmed manually.
- MakerWorld APIs do not expose AMS color-change, purge tower, or purge/flush waste as separate fields. This tool inherits the profile's raw `usedG` value and provides AMS extra buffer as a purchase safety margin, but it cannot split or audit the true waste source.
- Store links do not guarantee stock, pricing, shipping region, or product variants. Always check the store page before buying.
- Profile compatibility is only a hint based on public metadata. It does not replace slicer checks for size, material, nozzle, layer height, and print parameters.
- The built-in catalog mainly covers common Bambu Lab PLA/PETG/ABS filaments. Missing catalog entries fall back to generic color buckets.

## Privacy

Read [PRIVACY.md](./PRIVACY.md).

Short version:

- The current plan is stored in the user's browser localStorage.
- The Express server uses submitted MakerWorld links to request public profile metadata.
- The project code does not intentionally persist submitted links, stock settings, or purchase plans.
- Hosting platforms or reverse proxies may keep access logs depending on their configuration.

## Open Source and Contributing

- License: [AGPL-3.0-or-later](./LICENSE)
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Security reporting: [SECURITY.md](./SECURITY.md)
- Trademark notice: [TRADEMARKS.md](./TRADEMARKS.md)
- Release checklist: [docs/RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md)

## Risk Notice

This is a pre-purchase planning helper, not an official quote, official compatibility judgment, or checkout automation system. Before buying, confirm color names, SKUs, quantities, prices, stock, shipping region, profile parameters, and slicer results manually.
