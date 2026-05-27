# Agent Instructions

## Commit Rules

- Use Conventional Commit messages for every commit.
- Allowed prefixes include `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`, and `build:`.
- Prefer the smallest accurate prefix. Examples:
  - `feat: prepare browser store release`
  - `fix: correct shortcode replacement in composer`
  - `docs: update store listing notes`
  - `ci: add release artifact workflow`
- Before committing, run `git status --short` and review the staged diff.
- Do not commit unrelated user changes.

## Release Rules

- Keep `package.json`, `package-lock.json`, and `manifest.json` versions in sync.
- Use `npm run version:bump -- <version>` for version changes.
- Run `npm test` before release-related commits.
- Run `npm run package` before creating or moving a release tag.
- Release tags use `v<version>`, for example `v0.1.0`.
- The GitHub release workflow attaches `dist/*.zip` to tagged releases.

## Store Assets

- Store listing copy lives in `docs/store-listing.md`.
- The small promo image is `assets/promo-small.png` and must remain a 440x280 PNG.
- Do not replace store images with SVG assets unless explicitly requested.

## Project Notes

- This is a Manifest V3 browser extension for X/Twitter composer emoji shortcodes.
- The emoji search layer opens with `Ctrl+Alt+.` or the extension icon, groups emojis by generated search category, filters by shortcode text, and inserts the clicked emoji at the composer position saved before the layer opened, or copies it when no composer is active.
- The extension should remain local-only: no analytics, no external API calls, and no broad permissions.
- Keep generated package ZIPs in `dist/`; `dist/` and `*.zip` are ignored by git.
