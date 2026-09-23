# Ava &amp; Noah — Wedding Site

Static one-page wedding site with an RSVP (reservation) form. No build step and no
dependencies: plain HTML, CSS and JavaScript, deployed to GitHub Pages by
`.github/workflows/static.yml` on every push to `main`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page content: hero, details, schedule, venue, RSVP form, FAQ |
| `styles.css` | Styling and light/dark theming via CSS custom properties |
| `app.js` | Countdown, mobile nav, RSVP validation, storage and admin view |

## Running locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Collecting RSVPs

By default every RSVP is stored in the guest's own browser (`localStorage`), which means
only that guest sees it. Set `FORM_ENDPOINT` at the top of `app.js` to send entries
somewhere central instead. The payload is JSON: `name`, `email`, `phone`, `attending`,
`guests`, `meal`, `diet`, `shuttle`, `message`, `submittedAt`.

### Saving to a Google Sheet

A spreadsheet's `.../pubhtml` "publish to web" link is read-only — it can be displayed but
not written to. Writing needs an Apps Script web app bound to the sheet:

1. Open the spreadsheet in Google Sheets (the editing URL, not the published one) and
   choose **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs)
   from this repo and save. `SPREADSHEET_ID` at the top names the target spreadsheet;
   change it if the entries should land somewhere else.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as** to *Me* and
   **Who has access** to *Anyone*, then deploy and approve the permission prompt.
4. Copy the deployment's `/exec` URL and paste it into `app.js`:

   ```js
   var FORM_ENDPOINT = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```

5. Commit and push. Submit a test RSVP and confirm a row lands on the `RSVPs` tab.

The script creates the `RSVPs` tab with a header row on first use and appends one row per
submission. Opening the `/exec` URL in a browser returns `{"ok":true,"rows":N}`, which is a
quick way to check the deployment is live.

Three things to keep in mind:

- **Who has access: Anyone** is what lets guests submit without a Google login. It also
  means anyone who learns the `/exec` URL can append rows, so treat the sheet as
  append-only and unverified input.
- The sheet collects names, emails and phone numbers. Share it with named people rather
  than leaving it on *anyone with the link*, since that link plus the spreadsheet id in
  this repo is enough for anyone to read the guest list.
- After editing the script, run **Deploy → Manage deployments → Edit → New version**,
  otherwise the old code keeps serving.

If the endpoint is unreachable, the RSVP still saves to the guest's browser, so the entry is
recoverable from the `?admin` view on that device.

## Admin view

Append `?admin` to the URL (for example http://localhost:8000/?admin) to list the RSVPs
stored in the current browser, download them as CSV, or clear them. This reads local
storage only — it is a convenience for testing, not a shared dashboard.

## Customising

- Names, date, venue and copy: edit `index.html`.
- Countdown target: `WEDDING_DATE` in `app.js`.
- Colours, fonts and spacing: the `:root` custom properties in `styles.css`.
