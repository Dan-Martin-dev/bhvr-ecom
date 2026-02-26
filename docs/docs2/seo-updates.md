# SEO & Skill Improvements Applied

I installed relevant agent skills and applied foundational SEO and framework improvements to the web app. This document summarizes what I installed, what changes I made, and where to look in the codebase.

## Installed Skills
- `bun-development` — Bun best practices
- `hono` — Hono backend guidance
- `vite` — Vite optimizations
- `vercel-react-best-practices` — React performance patterns
- `ecommerce-seo-audit` — E-commerce SEO audit guidance

## Key Changes Applied

1) Structured Data & JSON-LD (Product Pages)
- Added product JSON-LD to product pages so search engines can pick up price, availability, images, SKU, and name.
- File: `apps/web/src/routes/(shop)/products/$slug.tsx`

2) Dynamic Meta Tags (OG / Twitter)
- Product pages and the products collection now emit dynamic `title`, `description`, `og:*`, and `twitter:*` meta tags via TanStack Router `head()` APIs.
- Files: `apps/web/src/routes/(shop)/products/$slug.tsx`, `apps/web/src/routes/(shop)/products/index.tsx`

3) Global SEO Foundations
- Added description, keywords, Open Graph, and Twitter card defaults.
- Files: `apps/web/index.html`, `apps/web/src/routes/__root.tsx`, `apps/web/src/routes/index.tsx`

4) Crawl Control & Sitemap
- Added `robots.txt` to block low-value pages (`/admin`, `/cart`, `/checkout`) and a simple `sitemap.xml` to improve discoverability.
- Files: `apps/web/public/robots.txt`, `apps/web/public/sitemap.xml`

5) React Query / Data Architecture
- Wrapped the app with `QueryClientProvider` and injected `queryClient` into TanStack Router context to enable loader prefetching and avoid missing providers.
- File: `apps/web/src/main.tsx`

## Files Changed (high level)
- `apps/web/index.html` — added meta tags and social tags
- `apps/web/public/robots.txt`, `apps/web/public/sitemap.xml` — new files
- `apps/web/src/routes/__root.tsx` — added global head metadata and typed Router context
- `apps/web/src/routes/index.tsx` — home route metadata + WebSite JSON-LD
- `apps/web/src/routes/(shop)/products/index.tsx` — collection head metadata
- `apps/web/src/routes/(shop)/products/$slug.tsx` — loader, dynamic head, canonical link, and Product JSON-LD
- `apps/web/src/main.tsx` — added QueryClientProvider and query client

## Build / Verification
- I ran a production build of the frontend (`bun run build` inside `apps/web`) and a server build (`bun run build --filter=server`). Both completed successfully. Vite gave a chunk-size warning — consider code-splitting for very large bundles.

## Next Steps (recommendations)
1. Provide a real sitemap generator (or integrate product/category sitemap generation) and submit it to GSC.
2. Run an SEO audit (the `ecommerce-seo-audit` skill can perform this for specific URLs or crawl exports). Provide crawl exports/logs for a deeper internal-link and log-file analysis.
3. Implement lazy-loading / code-splitting for large bundles (follow `vercel-react-best-practices` rules for bundle splitting).
4. Add richer product schema fields where available (gtin, mpn, aggregateRating) and verify with the Schema validator.

If you want, I can open a PR with these changes or continue with a deeper SEO audit (I can use the installed `ecommerce-seo-audit` skill to run checks against specific URLs you provide).
