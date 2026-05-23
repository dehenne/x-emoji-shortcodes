# Contributing

Thanks for considering a contribution. Keep changes focused and small.

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm test
```

Build the generated shortcode map after updating `gemoji`:

```bash
npm run build:emoji-map
```

Create a local extension package:

```bash
npm run package
```

## Commit style

Use Conventional Commits:

- `feat:` for user-facing functionality
- `fix:` for bug fixes
- `docs:` for documentation-only changes
- `refactor:` for code changes without behavior changes
- `test:` for test changes
- `chore:` for tooling, packaging, and maintenance

## Pull requests

Include a short summary, list user-visible behavior changes, and mention how you tested the change.
