# Contributing

Thanks for taking a look at this project. This tool is an early MVP, so small, focused changes are easiest to review.

## Development

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run check
```

## Pull requests

- Keep one behavioral change per pull request when possible.
- Include screenshots or short screen recordings for UI changes.
- Note any MakerWorld links used for manual testing.
- Update `README.md` or `docs/` when changing user-facing behavior, data assumptions, or known limitations.

## Good first areas

- More filament catalog coverage.
- Better color matching aliases.
- Export formats for purchase planning.
- Tests around URL parsing, filament aggregation, and purchase quantity calculations.

## Out of scope

This project should remain a pre-purchase planning helper. It should not automate checkout, claim official compatibility, or bypass third-party service limits.
