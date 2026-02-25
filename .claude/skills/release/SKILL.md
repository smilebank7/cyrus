---
name: release
description: Run a Sylas release by publishing all packages to npm in the correct dependency order, updating changelogs, and creating git tags.
---

# Release

Publish Sylas packages to npm and create a release.

## Pre-Publishing Checklist

1. **Update CHANGELOG.md and CHANGELOG.internal.md**:
   - Move items from `## [Unreleased]` to a new versioned section in both files
   - Use the CLI version number (e.g., `## [0.1.22] - 2025-01-06`)
   - CHANGELOG.md: Focus on end-user impact from the perspective of the `sylas` CLI
   - CHANGELOG.internal.md: Internal development changes, refactors, and tooling updates

2. **Check Linear Issues**:
   - Review all Linear issues mentioned in the Unreleased changelog
   - These will be moved from 'MergedUnreleased' to 'ReleasedMonitoring' after release

3. **Commit all changes**:
   ```bash
   git add -A
   git commit -m "Prepare release v0.1.XX"
   git push
   ```

## Publishing Workflow

### 1. Install dependencies from root
```bash
pnpm install  # Ensures all workspace dependencies are up to date
```

### 2. Build all packages from root first
```bash
pnpm build  # Builds all packages to ensure dependencies are resolved
```

### 3. Publish packages in dependency order
**IMPORTANT**: Publish in this exact order (topological sort by workspace deps):
```bash
# Tier 1: No internal dependencies
cd packages/core && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install
cd packages/cloudflare-tunnel-client && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

cd packages/mcp-tools && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

# Tier 2: Depends on core only
cd packages/claude-runner && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

cd packages/codex-runner && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

cd packages/cursor-runner && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install
cd packages/config-updater && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install
cd packages/linear-event-transport && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

cd packages/github-event-transport && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

cd packages/opencode-runner && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

cd packages/slack-event-transport && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

# Tier 3: Depends on claude-runner + core
cd packages/simple-agent-runner && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

# Tier 4: Depends on claude-runner + core + simple-agent-runner
cd packages/gemini-runner && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install

# Tier 5: Depends on all packages above
cd packages/edge-worker && pnpm publish --access public --no-git-checks
cd ../.. && pnpm install
```

### 4. Publish the CLI
```bash
pnpm install  # Final install to ensure all deps are latest
cd apps/cli && pnpm publish --access public --no-git-checks
cd ../..
```

### 5. Create git tag and push
```bash
git tag v0.1.XX
git push origin <branch-name>
git push origin v0.1.XX
```

### 6. Create GitHub Release
Create a GitHub release using the changelog notes as the content:
```bash
gh release create v0.1.XX --title "v0.1.XX" --notes-file - << 'EOF'
<paste the changelog notes for this version here>
EOF
```

Or interactively:
```bash
gh release create v0.1.XX --title "v0.1.XX" --notes "$(cat CHANGELOG.md | sed -n '/## \[0.1.XX\]/,/## \[/p' | head -n -1)"
```

### 7. Update Linear Issues
After a successful release, move each Linear issue mentioned in the changelog from 'MergedUnreleased' (Done) status to 'ReleasedMonitoring' (also Done) status.

### 8. Create Pull Request
**IMPORTANT**: Always create a PR to merge the release changes back to main:
```bash
gh pr create --title "Release v0.1.XX" --body "$(cat <<'EOF'
## Summary
- Release v0.1.XX to npm
- Update changelogs
- Create git tag

## Changes
- CHANGELOG.md updated with v0.1.XX release notes
- CHANGELOG.internal.md updated
- Package versions bumped to 0.1.XX

## Links
- [GitHub Release](https://github.com/smilebank7/sylas/releases/tag/v0.1.XX)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Key Notes

- Always use `--no-git-checks` flag to publish from feature branches
- Run `pnpm install` after each publish to update the lockfile
- The `simple-agent-runner` package MUST be published before `edge-worker`
- Build all packages once at the start, then publish without rebuilding
- This ensures `workspace:*` references resolve to published versions

## Examples

- "release" - Run the full release process
- "/release" - Invoke the release skill
