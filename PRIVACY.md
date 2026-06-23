# Privacy

This project is designed as a local-first planning helper.

## Data entered by users

Users may enter MakerWorld model URLs, selected print profiles, stock quantities, spool weights, safety margin settings, and color mapping choices.

## Browser storage

The app stores the current planning state and language/help preferences in the user's browser local storage so the plan can be resumed later on the same device.

Users can clear the plan from the app UI, or clear site data from the browser.

## Server behavior

The included Express server resolves submitted MakerWorld URLs by requesting public profile metadata from MakerWorld/Bambu Lab API endpoints. The server does not intentionally persist submitted URLs or resolved project data.

Deployment platforms, reverse proxies, or hosting providers may keep operational logs such as request timestamps, IP addresses, URLs, status codes, or error traces depending on their configuration.

## Third-party services

The app links to MakerWorld and Bambu Lab pages. Once users open those pages, the privacy policies and terms of those services apply.
