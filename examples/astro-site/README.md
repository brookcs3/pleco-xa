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

To generate a sitemap for better indexing when you deploy:

1. Install the sitemap integration:
   ```bash
   npm install -D @astrojs/sitemap
   ```
2. Configure `astro.config.mjs` with your site URL and the integration:
   ```javascript
   import { defineConfig } from 'astro/config';
   import sitemap from '@astrojs/sitemap';

   export default defineConfig({
     site: 'https://example.com', // replace with your domain
     output: 'static',
     integrations: [sitemap()],
   });
   ```
3. Run `npm run build`. The sitemap will be generated in the `dist/` folder.

Deploy the `dist/` directory to your hosting provider and your sitemap will be
available alongside the site content.
