# Publishing to the Chrome Web Store

## Once, by hand

1. Register as a Chrome Web Store developer at https://chrome.google.com/webstore/devconsole (one-time $5 fee).
2. Deploy the site first, so https://cherry-ui.com/privacy is live.
3. `npm run extension:zip` and upload `cherry-extension.zip` as a new item.
4. Fill in the listing and privacy tabs from [LISTING.md](LISTING.md) and the images in this folder, then submit for review.

## Automatic releases afterwards

Create OAuth credentials for the Chrome Web Store API (see the chrome-webstore-upload-cli guide: https://github.com/fregante/chrome-webstore-upload-keys), then add these secrets to a GitHub environment named `chrome-web-store`:

| Secret | Value |
|---|---|
| `CHROME_EXTENSION_ID` | The item ID from the developer dashboard |
| `CHROME_PUBLISHER_ID` | Your publisher ID from the dashboard |
| `CHROME_CLIENT_ID` | OAuth client ID |
| `CHROME_CLIENT_SECRET` | OAuth client secret |
| `CHROME_REFRESH_TOKEN` | OAuth refresh token |

To release: bump `version` in `extension/manifest.json`, commit, then

```bash
git tag extension-v1.0.1 && git push --tags
```

The `Publish Chrome extension` workflow checks the tag against the manifest, packages, uploads and submits it for review.

`promo-tile.html` is the source of the promo tile.
