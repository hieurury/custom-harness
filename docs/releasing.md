# Building and releasing

## Build locally

Requirements: Node.js 22, npm, and a supported Linux or Windows build host.

```bash
npm --prefix opencode/installer ci
npm --prefix opencode/installer test
xvfb-run -a npm --prefix opencode/installer run test:ui
npm --prefix opencode/installer run build:linux
```

Build the Windows installer on Windows:

```powershell
npm --prefix opencode/installer ci
npm --prefix opencode/installer run build:win
```

Build outputs are written to `opencode/installer/dist/`. The shared installer
packages both currently supported integrations.

## CI

`ci.yml` runs on pull requests and pushes to `main`. It installs from the
lockfile, runs installer tests and UI tests, and builds Linux and Windows
artifacts. It does not create a Release or receive signing credentials.

## Release flow

1. Set the version in both runtime manifests, then run
   `npm --prefix opencode/installer run sync:version` and
   `node antigravity/scripts/sync-version.js`.
2. Commit the version and lockfile changes; create and push a matching tag such
   as `v1.0.1-rc.1` or `v1.0.1`.
3. `release.yml` validates that the tag matches the project version, runs the
   tests, builds Linux and Windows packages, creates SHA-256 checksums, and
   opens a **draft** GitHub Release.
4. Review the artifacts, release notes, checksums, and Windows signing status.
   Publish the draft manually when ready.

Prerelease tags containing `-` may be unsigned and are marked prerelease. A
stable tag requires valid Windows signing configuration and verified
Authenticode publisher/timestamp information; otherwise the workflow fails.

## Release visibility and automatic updates

The repository is public, so published GitHub Release metadata and assets can
be read anonymously by the built-in updater. Draft releases are not visible to
users until published. The updater verifies a downloaded asset against
`SHA256SUMS.txt` and saves it for the user; it does not run the installer
automatically.

If the repository is made private, the updater cannot access its release
metadata or assets without an authorized distribution method (for example, an
authenticated release client or a separate public artifact host). Do not embed
a maintainer token in the installer.

## Cost notes

The project can be built and used without purchasing a signing certificate.
GitHub Free includes a limited monthly compute allowance for private Actions
and 500 MB of artifact/package storage; actual use depends on runner type and
retention. The release workflow is intentionally draft-first. Windows signing
is an additional publisher expense if you choose Azure Artifact Signing or a
certificate authority; see [signing](signing.md).
