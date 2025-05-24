# Astro Static Demo

This example demonstrates how to integrate Pleco Xa with an Astro site and gate premium features behind a paywall. It outputs a fully static build suitable for GitHub Pages or Netlify.

## Development

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

## Deployment

### GitHub Pages

1. Set the `site` option in `astro.config.mjs` to your repository URL, e.g.
   `https://<user>.github.io/<repo>/`.
2. Run `npm run build` to generate the static site in `dist/`.
3. Push the contents of `dist/` to a `gh-pages` branch or use a GitHub Action
   to deploy automatically.

### Netlify

1. Create a new site from your GitHub repository in the Netlify dashboard.
2. Use `npm run build` as the build command and `dist` as the publish directory.

### Sitemap Generation

To generate a sitemap for better indexing, install the `@astrojs/sitemap`
integration and define the `site` option in `astro.config.mjs`.

Deploy the `dist/` folder to your static hosting provider.
