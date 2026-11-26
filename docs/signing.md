# Windows signing

Windows code signing identifies the publisher and helps users verify that a
download has not been changed. It is separate from antivirus detection and does
not guarantee that SmartScreen or security software will never show a warning.
Signing the Harness installer also does not sign the target application.

Unsigned Windows builds can still be built and downloaded, but Windows may
show an unknown-publisher or reputation warning. Do not advise users to disable
security protections to get around a warning. Investigate antivirus detections
separately and submit a false positive to the vendor when appropriate.

## Signing modes

The Windows release workflow supports two maintainer-configured modes:

- **Azure Trusted Signing**: configure `WINDOWS_SIGNING_MODE=azure`, the
  publisher name, signing endpoint, account, and certificate profile as
  GitHub Environment variables. Store the Azure tenant, client, and secret as
  environment secrets. The CI identity needs only the signing permissions it
  requires.
- **PFX certificate**: configure `WINDOWS_SIGNING_MODE=pfx` and store
  `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` as GitHub Environment secrets. Use a
  certificate and key-storage method permitted by its certificate authority.

Create a GitHub Environment named `release-signing` and restrict it to release
tags. Never commit signing keys, certificates, or passwords. Pull-request
builds do not receive signing credentials. A stable release fails if signing
is not configured; prereleases may be explicitly marked unsigned.

The stable-release verification checks Authenticode status, timestamp, and
publisher identity before artifacts are uploaded. A successful build alone is
not evidence of a valid signature.

## Cost and availability

People can use the installer without paying for code signing. The Windows
installer can be built unsigned, but it may show an unknown-publisher warning.
Signing is for the publisher; it is not a subscription users need to buy.

As of November 2026, Microsoft lists Artifact Signing Basic at US$9.99/month
and Premium at US$99.99/month, subject to eligibility and regional
availability. A certificate from another certificate authority may have its
own price and key-storage requirements. GitHub Free includes some monthly
compute for private-repository Actions; usage and artifact storage are limited
and additional usage may be billed. Check the account's billing page before
enabling release workflows.

- [Microsoft Artifact Signing pricing tiers](https://learn.microsoft.com/en-us/azure/artifact-signing/how-to-change-sku)
- [GitHub Actions billing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)

If no signing identity is configured, publish a clearly labeled unsigned
prerelease only, or wait to publish a stable Windows build.
