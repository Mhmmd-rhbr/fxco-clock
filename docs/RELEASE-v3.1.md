# AryamerX Financial Clock 3.1.0

Prepared 18 November 2026. This release repairs the installation error `Could not decode image: 'logoamx.png'`.

Version 3.0.0 declared a 2500 × 2500 logo for every icon size. It needs 25,000,000 bytes at 32 bits per pixel, which exceeds [Chromium's extension image limit](https://github.com/chromium/chromium/blob/main/extensions/browser/image_sanitizer.cc) of 16 MiB. Chromium's installer does not shrink an image to fit this limit.

The original artwork remains in the source tree. The release contains RGB-compatible PNG exports at 16, 32, 48 and 128 pixels, and the interface and optional notifications reuse the 128-pixel icon. No permissions or storage keys changed.

Packaging now verifies that manifest icon paths match their declared sizes, tests archive integrity, and validates PNG signatures, checksums, decoded pixel lengths, filter bytes and the installation image size budget using the archived files. Regression tests cover the original oversized PNG and corrupt pixel data with a valid checksum.

- Upload file: `dist/aryamerx-financial-clock-3.1.0.zip`
- Size: 62,732 bytes
- SHA-256: `dff8dc3f7e2ab93a6fe38f1f2a40a2cdf9c9482365b2b8625906a17754500e3d`
- Local validation: 32 automated tests passed, the ZIP passed integrity validation, and Google Chrome successfully repacked the extracted ZIP contents in an isolated temporary profile. This is a local package check, not a Web Store installation.

Upload the ZIP as a new package for the existing Chrome Web Store item `kfckocecbefclalkmjdkkpaoehicbede`. The version must be higher than any version already submitted for that item. Leave the store's Privacy Policy field pointing at the verified public policy page. Once 3.1.0 is published, perform a fresh install from the store using a clean Chrome profile and confirm that the installed version is 3.1.0.
