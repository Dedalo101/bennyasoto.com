# bennyasoto.com

Static artist site for **Benny Yasoto** (Dedalo101 architecture).

## Structure

```
assets/css/theme.css    — visual theme (also inlined in index.html for deploy)
assets/fonts/           — self-hosted Share Tech Mono + Special Elite
assets/images/          — photos (benny-yasoto.jpg / .webp)
assets/js/visuals.js    — canvas engine source (inlined into index.html on deploy)
assets/js/bio-modal.js  — bio + enlaces modals
scripts/embed-visuals.mjs — inlines visuals.js into index.html
preview-visuals.html    — local preview (loads external visuals.js)
index.html
robots.txt
sitemap.xml
```

## Visuals workflow

Edit `assets/js/visuals.js`, then:

```bash
node scripts/embed-visuals.mjs
npx html-validate index.html
```

CI runs `embed-visuals.mjs --check` to ensure `index.html` stays in sync.

PocketBase / `dedalo-core` sync: deferred until v2 (track in Dedalo101-Core when ready).

## Links

| Label | URL |
|-------|-----|
| Glue Records | https://gluerecords.club |
| Instagram | https://www.instagram.com/bennyyasoto/ |
| Bookings | mailto:bookings@bennyasoto.com |

## Porkbun email

Set up `bookings@bennyasoto.com` → your inbox at https://porkbun.com/account/domains

## Local preview

```bash
npx serve .
```

Live: https://bennyasoto.com