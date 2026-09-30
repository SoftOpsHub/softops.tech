# softops.tech

The SoftOps website. One static page, no framework, no build step, no trackers.

## Why it is built this way

The site is part of the pitch. A company that sells engineering quality should have a page that loads
instantly, works without JavaScript, respects reduced motion and dark/light preferences, and makes
zero third-party requests. The footer measures and prints the page's real weight in the visitor's
browser. Keep that number honest.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The whole site: hero, receipts, case files, capabilities, method, company, contact |
| `404.html` | Not-found page (served automatically by GitHub Pages) |
| `assets/css/site.css` | All styles. Design tokens at the top; light mode is a token override |
| `assets/js/site.js` | Particle mark, scroll reveals, case deep-links, brief → email, page-weight readout |
| `assets/fonts/` | Geist and Geist Mono (latin subset, self-hosted, SIL OFL) |
| `assets/img/` | Favicon, logo mark (vector), Open Graph image, touch icon |
| `scripts/check.mjs` | Pre-deploy checks: links, anchors, no third-party requests, weight budget |

## Run locally

```bash
python3 -m http.server 8080     # then open http://localhost:8080
node scripts/check.mjs          # the same checks CI runs
```

Use a local server rather than opening the file directly: asset paths are root-relative.

## Deploy

`.github/workflows/deploy.yml`:

- **Pull requests to `main`**: run `scripts/check.mjs`. Nothing is deployed.
- **Push to `main`**: the same checks, then deploy to GitHub Pages and smoke-test the live URLs.

One-time setup: *Settings → Pages → Source: GitHub Actions*, custom domain `softops.tech`,
*Enforce HTTPS* on. At the DNS provider, point the apex at GitHub Pages (A records
`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) and `www` as a CNAME to
`softopshub.github.io`.

## Editing content

- **Case files** are the `<details class="case">` blocks in `index.html`. Each has an `id` that works
  as a deep link (`softops.tech/#zero-trust` opens that case), so you can send a prospect straight to
  the relevant work.
- **Clients stay anonymous.** Describe the sector, region and engineering, never the name, logo,
  people or screenshots. The internal register with real names is
  `docs/company-portfolio/clients-and-projects.md` in the company docs, not in this repo.
- **Every number must be real** and traceable to that register. Round down, never up.
- The contact address appears in `index.html` in four places (JSON-LD, form `action`, fallback link,
  footer). Change all four together.
