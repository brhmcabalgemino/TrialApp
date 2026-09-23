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
only that guest sees it. To collect responses centrally, set `FORM_ENDPOINT` at the top of
`app.js` to a form backend that accepts a JSON `POST` (Formspree, Getform, a Google Apps
Script web app, or your own API):

```js
var FORM_ENDPOINT = "https://formspree.io/f/xxxxxxx";
```

The submitted payload contains: `name`, `email`, `phone`, `attending`, `guests`, `meal`,
`diet`, `shuttle`, `message`, `submittedAt`.

## Admin view

Append `?admin` to the URL (for example http://localhost:8000/?admin) to list the RSVPs
stored in the current browser, download them as CSV, or clear them. This reads local
storage only — it is a convenience for testing, not a shared dashboard.

## Customising

- Names, date, venue and copy: edit `index.html`.
- Countdown target: `WEDDING_DATE` in `app.js`.
- Colours, fonts and spacing: the `:root` custom properties in `styles.css`.
