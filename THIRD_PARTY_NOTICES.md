# Third-party notices

This file identifies third-party resources currently bundled with the
application payloads. The corresponding license text is included in
[`licenses/fonts/`](licenses/fonts/) and in the shared installer's packaged
resources.

## Fonts

The following font families are distributed as WOFF2 subsets under the SIL Open
Font License, version 1.1 (OFL-1.1). Each upstream copyright notice and full
license text is included separately under [`licenses/fonts/`](licenses/fonts/):

| Font | Copyright / attribution | Upstream source |
| --- | --- | --- |
| JetBrains Mono | Copyright 2020 The JetBrains Mono Project Authors | [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) |
| VT323 | Copyright 2011 The VT323 Project Authors | [Google Fonts: VT323](https://github.com/google/fonts/tree/main/ofl/vt323) |
| Press Start 2P | Copyright 2012 The Press Start 2P Project Authors; “Press Start 2P” is a Reserved Font Name | [Google Fonts: Press Start 2P](https://github.com/google/fonts/tree/main/ofl/pressstart2p) |
| Silkscreen | Copyright 2001 The Silkscreen Project Authors | [Google Fonts: Silkscreen](https://github.com/google/fonts/tree/main/ofl/silkscreen) |

See [`licenses/fonts/NOTICE.md`](licenses/fonts/NOTICE.md) for the file mapping.

## Project artwork and other assets

The screenshots in `docs/images/opencode.png` and `docs/images/agy.png` were
captured from the maintainer's OpenCode and Antigravity application windows
with Custom Harness enabled. They show blank/welcome views and contain no chat
messages or conversation history.

The installer icons, UI logo and preview image, theme thumbnails, and pixel-owl
sprites/preview are present under `antigravity/` and `opencode/`; matching
copies have identical file contents. The maintainer reports that this artwork
was created for the project using AI generation or captured from the
maintainer's own product/development UI, and authorizes its distribution as
part of Custom Harness. The exact AI service, model, prompts, and generation
dates were not recorded in the repository; this notice records the
maintainer's provenance statement and is not an independent verification.

These assets are **not** covered by the font license or the root source-code
MIT license. This project notice permits their distribution bundled with
Custom Harness; it does not grant a separate blanket license to extract or
reuse the artwork. See [licensing guidance](docs/licensing.md).

The root [`LICENSE`](LICENSE) applies the MIT License to project-authored
source code. It does not relicense fonts or project artwork. Installer package
metadata also declares MIT. See
[licensing guidance](docs/licensing.md) for the scope.

## Other software

The installer bundles Electron and uses electron-builder during development.
Electron's runtime license and notices are distributed by electron-builder
with its application output. The npm dependency lockfiles record the versions
and package metadata for build-time dependencies.
