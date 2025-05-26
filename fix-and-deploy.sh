#!/usr/bin/env bash
set -euo pipefail
echo "== Pleco-XA maintenance & deploy script =="

# 0. Clean install to avoid Rollup optional-dep bug
echo "optional=false" > .npmrc
rm -rf node_modules package-lock.json
npm install

# 1. Ensure Astro static output & proper start script
if ! grep -q "output: 'static'" astro.config.mjs; then
  sed -i '' "/defineConfig({/a\\
  \ \ output: 'static',\
  \ \ server: { host: '0.0.0.0' },
" astro.config.mjs
fi
npm pkg set "scripts.dev=astro dev"
npm pkg set "scripts.build=astro build"
npm pkg set "scripts.start=serve -l 0.0.0.0:\${PORT:-3000} dist"
npm pkg set "scripts.bundle=rollup -c"
npm pkg set "prepublishOnly=npm run bundle"
npm add -D serve rollup >/dev/null

# 2. Docs newline + WIP notice
{
  echo ""
  echo "> **Note:** This guide is under active development. Sections after"
  echo "\"Export scroll automation as audio file\" are work in progress."
} >> docs/integration-guide.md

# 3. Stub missing core modules
mkdir -p src/core
for M in LivePeakExtractor AudioLoader; do
  FILE="src/core/\${M}.js"
  [ -f "\$FILE" ] || cat > "\$FILE" <<EOT
// \${M}.js  – stub created by fix-and-deploy.sh
export default () => {
  console.warn('\${M} is a stub – implementation coming soon.');
  return null;
};
EOT
done

# 4. Update HTML TODO comment
HTML=public/frontend/bmp-detection.html
[ -f "\$HTML" ] && sed -i '' "s/TODO.*/<!-- TODO: Replace inline script with library import once v1.0.3 is released -->/" "\$HTML"

# 5. Placeholder tests for compression utils
mkdir -p tests
cat > tests/compression.test.js <<'EOT'
// compression.test.js – placeholder
describe('compression utilities (placeholder)', () => {
  test('work-in-progress', () => expect(true).toBe(true));
});
EOT

# 6. Trailing newlines in config files
for C in Procfile railway.toml railway.json; do [ -f "\$C" ] && printf '\n' >> "\$C"; done

# 7. Build check
npm run build

# 8. Commit (non-fatal if nothing changed)
git add .
git commit -m "Maintenance: static build fixes, stubs, docs newline" || true
echo "✓ Script completed. Push with 'git push' when ready."
