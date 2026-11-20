# Flora & Fauna Observations — Offline Field Log

An installable, offline-first web app with two sections, **Flora** and **Fauna**. Everything is stored on the device (IndexedDB); no account or internet is needed after the first load.

## Each observation records
- **Flora:** Family · Genus · Species · Common name (English) · Common name (Afrikaans) · Date observed · Locality / specimen details · Flowering season / month · Research notes · Photograph
- **Fauna:** Family · Genus · Species · Common name (English) · Common name (Afrikaans) · Date observed · Locality / specimen details · Research notes · Photograph

Switch sections with the **Flora / Fauna** tabs. Tap an observation to edit it. **Save** and **Delete** are in the edit window (a deleted observation can be undone for a few seconds). "Add my GPS position" adds coordinates to the locality field.

## Using it
- Browse **by family** (family → genus → observations) or **by date** (newest first), as cards or a list. Search and filter by family or genus.
- Family, genus and species suggestions come from your own earlier observations in that section, and the family fills in automatically for a genus you have used before.
- **Backup & import:** export one JSON backup with both sections (includes photographs), or a CSV of the section you are viewing (text only; columns include commonNameEn and commonNameAf). Import a JSON backup (restores both sections; older flora-only backups also work) or a CSV into the section you are viewing. A reminder appears after 14 days without a backup.

## Hosting / installing
Open `index.html` to try it locally. To install it on a phone or computer and have it work fully offline, host the folder on any HTTPS site (for example GitHub Pages or Netlify), open the link once while online, then use "Add to Home screen" / "Install app".

When you change any file, raise `VERSION` in `sw.js` so installed copies update.

## Files
`index.html`, `styles.css`, `app.js`, `config.js` (app name and wording), `sw.js` (offline cache), `manifest.webmanifest`, icons.
