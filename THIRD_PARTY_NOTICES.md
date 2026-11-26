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

The illustrations in `docs/images/` are original vector artwork created for
this project. They are decorative theme illustrations, not screenshots of an
application or user content.

The repository also contains application icons, theme previews, and pet
sprites. Their original author/source and redistribution terms are not fully
recorded in the existing project metadata. They are **not** covered by the
font license; confirm and document each asset's provenance and permissions
before distributing a public release. Do not infer a license from an asset
being publicly accessible or AI-generated.

The project does not yet have a root `LICENSE` file defining the terms for the
complete source tree and original artwork. Existing package metadata that says
`MIT` is limited to that package and is not a substitute for a repository-wide
license decision. See [licensing guidance](docs/licensing.md).

## Other software

The installer bundles Electron and uses electron-builder during development.
Electron's runtime license and notices are distributed by electron-builder
with its application output. The npm dependency lockfiles record the versions
and package metadata for build-time dependencies.
