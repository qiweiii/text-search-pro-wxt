# Agent Guidelines

## Commits
- NEVER commit unless explicitly asked. Always wait for the user to say "commit", "pls commit", etc.
- When asked to commit, inspect `git status`, `git diff`, and recent `git log` for style.
- Stage only intended files. Never commit secrets.

## Dependencies
- Never install packages using `@latest` — supply chain attacks happen. Always pin exact versions.
- Check package maintenance: if last update > 3 months, avoid unless super stable (e.g. low-level network libs).
- Prefer overriding vulnerable transitive deps in `pnpm-workspace.yaml` over bumping direct deps when a patch version exists.
- After editing `package.json` or `pnpm-workspace.yaml`, run `pnpm install` and `pnpm audit` to verify.

## Code Style
- Do NOT add comments unless asked.
- Follow existing conventions in the codebase (naming, imports, formatting).
- Prepare changes in small chunks — big diffs break IDEs and tools.
- Refactor after editing to keep code clean, well-named, and well-structured.

## Testing & Verification
- Run `pnpm lint` and `pnpm check` after editing code (biome).
- Run unit tests if available, only minimum relevant tests (not the whole suite).
- Run `pnpm compile` (tsc --noEmit) after TS changes.
- Check `docs/*` for existing files that need updating after code changes.

## Tooling
- This project uses pnpm. Check `packageManager` field in `package.json`.
- Linter/formatter: Biome 2.5.4 (config in `biome.json`).
- Supply-chain policies are in `pnpm-workspace.yaml` (minimumReleaseAge, trustPolicy, blockExoticSubdeps, ignoreScripts, strictDepBuilds).
- `ignoreScripts: true` skips `postinstall` — run `pnpm wxt prepare` manually after install.

## Misc
- Do NOT write to `/tmp`. Use the current directory for temp files and remove after use.
- Prefer simple shell commands over node/python scripts unless necessary.
- Use questions to ask follow-up clarifications — saves request count.
- MARK: comments must be < 15 chars for IDE display.
