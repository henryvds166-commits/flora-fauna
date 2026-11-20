# Flora & Fauna Observations — Offline Field Log

An installable, offline-first web app with two sections, **Flora** and **Fauna**. Everything is stored on the device (IndexedDB); no account or internet is needed after the first load.

## Each observation records
- **Flora:** Family · Genus · Species · Common name (English) · Common name (Afrikaans) · Date observed · Locality / specimen details · Flowering season / month · Research notes · Photographs
- **Fauna:** Family · Genus · Species · Common name (English) · Common name (Afrikaans) · Date observed · Locality / specimen details · Research notes · Photographs

Switch sections with the **Flora / Fauna** tabs. Tap an observation to edit it. **Save** and **Delete** are in the edit window (a deleted observation can be undone for a few seconds). "Add my GPS position" adds coordinates to the locality field.

## Saving with only a common name
You only need **one name** to save an observation: a common name (English or Afrikaans), or a genus / species. If you only know the common name, save it now and add the family, genus and species later by opening the observation. Observations without a scientific name show a "Scientific name to be added" tag, and a **Needs scientific name** button lists just those. If you type a common name you have used before, the scientific name is filled in for you.

## Using it
- Browse **by family** (family → genus → observations) or **by date** (newest first), as cards or a list. Search and filter by family or genus.
- Family, genus and species suggestions come from your own earlier observations in that section, and the family fills in automatically for a genus you have used before.
- **Backup & import:** export one JSON backup with both sections (includes photographs), or a CSV of the section you are viewing (text only; columns include commonNameEn and commonNameAf). Import a JSON backup (restores both sections; older flora-only backups also work) or a CSV into the section you are viewing. A reminder appears after 14 days without a backup.

## Photographs
Each observation can hold up to 12 photographs. In the edit window use **Take photo** (opens a live camera view; allow Camera access when your browser asks, and use **Switch camera** to change between back and front camera) or **Add photos** (pick one or several from the gallery or, on a laptop, from your files). Tap a photo to enlarge it. Tap the **×** on a photo to delete it, or **Delete all photos**. Photo changes are kept when you press Save.

## Laptop and Android
The app works in Chrome or Edge on a laptop and in Chrome on Android. Records are stored on each device separately: use **Export JSON** on one device and **Import** on the other to move or merge your records.

To install it with full offline support, put the folder on any HTTPS site once (for example Netlify Drop at app.netlify.com/drop, or GitHub Pages), then open that link:
- **Android (Chrome):** tap the **Install app** button in the top bar, or the browser menu → *Install app* / *Add to Home screen*.
- **Laptop (Chrome/Edge):** click the **Install app** button in the top bar, or the install icon in the address bar.

On Android the back button closes the open window instead of leaving the app. Opening `index.html` directly also works for trying it out, but without the offline cache or installing.

When you change any file, raise `VERSION` in `sw.js` so installed copies update.

## Files
`index.html`, `styles.css`, `app.js`, `config.js` (app name and wording), `sw.js` (offline cache), `manifest.webmanifest`, icons.

© 2026 Henry van der Schyff. All rights reserved.
