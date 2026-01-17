# CDN Image Optimization Guide

## Overview

bhvr-ecom includes a flexible CDN-backed image optimization system that supports multiple providers:

- **Cloudinary** - Full-featured CDN with extensive transformations
- **Cloudflare Images** - Fast, affordable CDN with good performance
- **imgproxy** - Self-hosted open-source solution for complete control
- **Local** - Development mode (no CDN, serves images as-is)

## Features

✅ **Automatic format selection** — Serves WebP/AVIF to compatible browsers  
✅ **Responsive images** — Generates srcset for multiple screen sizes  
✅ **Lazy loading** — Built-in lazy loading with blur-up placeholders  
✅ **On-the-fly transformations** — Resize, crop, quality adjustment  
✅ **Developer-friendly** — React components + utility functions  
✅ **Type-safe** — Full TypeScript support

## Quick Start

### 1. Choose Your CDN Provider

#### Option A: Cloudinary (Recommended for beginners)

**Pros:** Easy setup, generous free tier, extensive features  
**Free tier:** 25 GB storage, 25 GB bandwidth/month

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your Cloud Name from the dashboard
3. Add to `.env`:

```bash
VITE_CDN_PROVIDER=cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name

# Server-side (optional, for uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Option B: Cloudflare Images

**Pros:** Fast, affordable, integrated with Cloudflare CDN  
**Cost:** $5/month for 100,000 images

1. Sign up for Cloudflare Images
2. Get your Account Hash from the dashboard
3. Add to `.env`:

```bash
VITE_CDN_PROVIDER=cloudflare
VITE_CLOUDFLARE_ACCOUNT_HASH=your_account_hash

# Server-side (optional, for uploads)
CLOUDFLARE_ACCOUNT_HASH=your_account_hash
CLOUDFLARE_API_TOKEN=your_api_token
```

#### Option C: imgproxy (Self-hosted)

**Pros:** Complete control, no vendor lock-in, privacy-friendly  
**Requirements:** Docker or VPS for hosting

1. Deploy imgproxy:

```bash
docker run -d \
  -p 8080:8080 \
  -e IMGPROXY_KEY=$(openssl rand -hex 64) \
  -e IMGPROXY_SALT=$(openssl rand -hex 64) \
  darthsim/imgproxy
```

2. Add to `.env`:

```bash
VITE_CDN_PROVIDER=imgproxy
VITE_IMGPROXY_URL=https://imgproxy.yourdomain.com

# Server-side
IMGPROXY_URL=https://imgproxy.yourdomain.com
IMGPROXY_KEY=your_key
IMGPROXY_SALT=your_salt
```

#### Option D: Local (Development)

No setup needed! Images are served as-is without transformations.

```bash
VITE_CDN_PROVIDER=local
```

### 2. Use in React Components

#### Simple usage with OptimizedImage

```tsx
import { OptimizedImage } from "@/components/OptimizedImage";

export function ProductCard({ product }) {
  return (
    <OptimizedImage
      src={product.image}
      alt={product.name}
      width={300}
      height={300}
      quality={85}
    />
  );
}
```

#### Pre-configured ProductImage component

```tsx
import { ProductImage } from "@/components/OptimizedImage";

export function ProductDetail({ product }) {
  return (
    <ProductImage
      src={product.image}
      alt={product.name}
      size="large" // thumb | small | medium | large
    />
  );
}
```

#### Responsive images with srcset

```tsx
<OptimizedImage
  src={product.image}
  alt={product.name}
  responsive
  responsiveWidths={[320, 640, 960, 1280]}
  sizes="(max-width: 768px) 100vw, 50vw"
  width={1280}
  height={720}
/>
```

#### With blur-up placeholder

```tsx
<OptimizedImage
  src={product.image}
  alt={product.name}
  width={600}
  height={600}
  placeholder // Enables LQIP (Low Quality Image Placeholder)
/>
```

### 3. Use Utility Functions

```tsx
import {
  getImageUrl,
  getProductImageUrl,
  getResponsiveSrcset,
  getPlaceholder,
} from "@bhvr-ecom/images/client";

// Simple optimized URL
const optimizedUrl = getImageUrl(imageUrl, {
  width: 600,
  height: 400,
  quality: 85,
  format: "auto",
});

// Product-specific helper
const productThumb = getProductImageUrl(imageUrl, "thumb");

// Generate srcset
const srcset = getResponsiveSrcset({
  src: imageUrl,
  widths: [320, 640, 960],
  quality: 80,
});

// Blur placeholder
const placeholder = getPlaceholder(imageUrl);
```

## Server-Side Usage

For server-side image processing (e.g., generating Open Graph images, email templates):

```ts
import { getImageUrl, getProductImageUrl } from "@bhvr-ecom/images";

// In API route or email template
const ogImage = getImageUrl(product.image, {
  width: 1200,
  height: 630,
  quality: 90,
  format: "jpg",
});
```

## Advanced Configuration

### Custom transformations

```tsx
<OptimizedImage
  src={image}
  alt="Hero banner"
  width={1920}
  height={600}
  quality={90}
  objectFit="cover"
  className="rounded-lg"
/>
```

### Handle errors with fallback

```tsx
<OptimizedImage
  src={product.image}
  alt={product.name}
  fallbackSrc="/images/placeholder.jpg"
  width={300}
  height={300}
/>
```

### Disable lazy loading

```tsx
<OptimizedImage
  src={hero.image}
  alt="Hero"
  loading="eager" // Load immediately (for above-fold images)
  width={1920}
  height={800}
/>
```

## Migration Guide

### Replacing existing `<img>` tags

**Before:**
```tsx
<img
  src={product.image}
  alt={product.name}
  width={300}
  height={300}
  loading="lazy"
/>
```

**After:**
```tsx
<ProductImage
  src={product.image}
  alt={product.name}
  size="small"
/>
```

### Updating product listing pages

**Before:**
```tsx
{products.map((product) => (
  <div key={product.id}>
    <img src={product.image} alt={product.name} />
  </div>
))}
```

**After:**
```tsx
{products.map((product) => (
  <div key={product.id}>
    <ProductImage
      src={product.image}
      alt={product.name}
      size="medium"
    />
  </div>
))}
```

## Performance Tips

1. **Use appropriate sizes** — Don't serve 4K images for thumbnails
2. **Enable responsive images** — Let browsers choose the right size
3. **Lazy load below-the-fold images** — Default behavior, keep it
4. **Use blur placeholders** — Better perceived performance
5. **Set explicit dimensions** — Prevents layout shift (better CLS)

## Troubleshooting

### Images not loading

1. Check CDN provider configuration in `.env`
2. Verify API keys/credentials are correct
3. Check browser console for CORS errors
4. Test with `VITE_CDN_PROVIDER=local` to isolate CDN issues

### Slow image loading

1. Reduce quality (80-85 is usually fine)
2. Use responsive images with appropriate widths
3. Enable CDN caching (automatic for most providers)
4. Check imgproxy resources if self-hosted

### Images look blurry

1. Increase quality setting (85-95 for product images)
2. Check DPR (device pixel ratio) support
3. Verify width/height match your container size

## Cost Optimization

### Cloudinary
- Free tier: 25 GB bandwidth/month
- Upgrade: $89/month for 50 GB bandwidth
- Tip: Enable auto-format and auto-quality

### Cloudflare Images
- $5/month for 100,000 images
- $1 per 100,000 images served
- Unlimited transformations

### imgproxy (Self-hosted)
- VPS cost: ~€5-10/month (Hetzner CX21/22)
- Resource usage: 1 GB RAM, 2 CPU cores
- Cache heavily for best performance

## Resources

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudflare Images Docs](https://developers.cloudflare.com/images/)
- [imgproxy Documentation](https://docs.imgproxy.net/)
- [Web.dev Image Optimization Guide](https://web.dev/fast/#optimize-your-images)

---

*Last updated: January 17, 2026*
