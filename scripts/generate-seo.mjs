import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GAMES } from '../src/games.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SITE_URL = (process.env.SITE_URL || 'https://offline-arcade.onrender.com').replace(/\/+$/, '')

const INDEX = join(DIST, 'index.html')
if (!existsSync(INDEX)) {
  console.error('dist/index.html not found. Run `vite build` first.')
  process.exit(1)
}

const baseHtml = readFileSync(INDEX, 'utf8')

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildGameHtml(game) {
  const title = `Play ${game.label} Online — Free`
  const description = `${game.emoji} Play ${game.label} free at Offline Arcade. ${game.desc} No downloads, works offline.`
  const url = `${SITE_URL}/play/${game.id}`
  const image = `${SITE_URL}/og-image.png`
  const meta = `
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Offline Arcade" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${url}" />`
  let html = baseHtml
  html = html.replace(/<meta property="og:[^>]*\/>\n?/g, '')
  html = html.replace(/<meta name="twitter:[^>]*\/>\n?/g, '')
  html = html.replace(/<meta name="description"[^>]*\/>/, meta)
  html = html.replace(/<meta name="robots"[^>]*\/>/, '<meta name="robots" content="index, follow" />')
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  html = html.replace(/(src|href)="\.\//g, '$1="/')
  return html
}

const now = new Date().toISOString().split('T')[0]
for (const game of GAMES) {
  const dir = join(DIST, 'play', game.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), buildGameHtml(game))
}
console.log(`Generated ${GAMES.length} per-game pages in dist/play/`)

const urls = []
for (const game of GAMES) {
  urls.push(`  <url>\n    <loc>${SITE_URL}/play/${game.id}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`)
}
const staticPages = ['/', '/leagues', '/stats', '/achievements', '/shop', '/friends', '/leaderboard', '/about-us', '/download', '/settings']
for (const p of staticPages) {
  urls.push(`  <url>\n    <loc>${SITE_URL}${p}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`)
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
writeFileSync(join(DIST, 'sitemap.xml'), sitemap)
console.log(`Wrote sitemap.xml with ${urls.length} URLs`)
