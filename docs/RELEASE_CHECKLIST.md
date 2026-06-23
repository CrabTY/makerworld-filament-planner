# Release Checklist

Use this checklist before tagging a public release.

## Repository

- [ ] Confirm no secrets, cookies, private URLs, or personal test data are committed.
- [ ] Confirm internal screenshots and audit artifacts are not included unless intentionally published.
- [ ] Update `README.md`, `CHANGELOG.md`, and version metadata.
- [ ] Confirm license, privacy, trademark, security, and contribution docs are present.

## Verification

- [ ] Run `npm run check`.
- [ ] Manually test resolving at least one `makerworld.com` link.
- [ ] Manually test resolving at least one `makerworld.com.cn` link.
- [ ] Test profile selection, color mapping, CSV export, copy list, and Bambu cart link generation.
- [ ] Test mobile layout for the main purchase flow.

## Deployment

- [ ] Build the app with `npm run build`.
- [ ] Deploy the frontend and Express server together, or configure `/api` routing to the server.
- [ ] Set `PORT` if the hosting provider requires it.
- [ ] Review hosting logs to confirm submitted planning data is not logged unnecessarily.

## GitHub

- [ ] Push to `main`.
- [ ] Confirm GitHub Actions pass.
- [ ] Create a signed or annotated tag, for example `v0.1.0`.
- [ ] Draft a GitHub release with known limitations and upgrade notes.
