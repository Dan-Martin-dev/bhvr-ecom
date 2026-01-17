# @bhvr-ecom/images

Image optimization package with CDN support for bhvr-ecom.

## Features

- **Multiple CDN providers:** Cloudinary, Cloudflare Images, imgproxy, local
- **Automatic format selection:** WebP/AVIF based on browser support
- **Responsive images:** Generate srcset for multiple screen sizes
- **Lazy loading:** Built-in lazy loading with blur-up placeholders
- **Type-safe:** Full TypeScript support
- **Server & Client:** Works in both Node.js and browser environments

## Installation

```bash
bun add @bhvr-ecom/images
```

## Configuration

Add to your `.env`:

```bash
# Choose one CDN provider
VITE_CDN_PROVIDER=cloudinary  # or cloudflare, imgproxy, local

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_CLOUD_NAME=your_cloud_name

# Cloudflare Images
VITE_CLOUDFLARE_ACCOUNT_HASH=your_account_hash
CLOUDFLARE_ACCOUNT_HASH=your_account_hash

# imgproxy (Self-hosted)
VITE_IMGPROXY_URL=https://imgproxy.yourdomain.com
IMGPROXY_URL=https://imgproxy.yourdomain.com
```

## Usage

### Server-side (Hono API, Email Templates)

```ts
import { getImageUrl, getProductImageUrl } from "@bhvr-ecom/images";

// Generate optimized URL
const optimizedUrl = getImageUrl(imageUrl, {
  width: 600,
  height: 400,
  quality: 85,
  format: "auto",
});

// Product-specific helper
const thumbnail = getProductImageUrl(imageUrl, "thumb");
```

### Client-side (React Components)

```ts
import { getImageUrl, getProductImageUrl } from "@bhvr-ecom/images/client";

// Same API as server-side
const optimizedUrl = getImageUrl(imageUrl, {
  width: 600,
  quality: 85,
});
```

### React Component

```tsx
import { OptimizedImage, ProductImage } from "@/components/OptimizedImage";

// Simple usage
<ProductImage
  src={product.image}
  alt={product.name}
  size="medium"
/>

// Advanced usage
<OptimizedImage
  src={image}
  alt="Product"
  width={800}
  height={600}
  responsive
  responsiveWidths={[400, 800, 1200]}
  placeholder
/>
```

## API

### getImageUrl(src, options)

Generate an optimized image URL.

**Options:**
- `width` - Target width in pixels
- `height` - Target height in pixels
- `quality` - Image quality (1-100)
- `format` - Image format ("auto", "webp", "avif", "jpg", "png")
- `fit` - How to fit the image ("cover", "contain", "fill")
- `gravity` - Focus point ("center", "face", "auto", etc.)
- `blur` - Blur amount for placeholders
- `dpr` - Device pixel ratio (1, 2, or 3)

### getProductImageUrl(src, size)

Generate a product image URL with preset sizes.

**Sizes:**
- `thumb` - 150x150
- `small` - 300x300
- `medium` - 600x600
- `large` - 1200x1200
- `original` - No resize

### getResponsiveSrcset(config)

Generate a responsive image srcset string.

```ts
const srcset = getResponsiveSrcset({
  src: imageUrl,
  widths: [320, 640, 960, 1280],
  quality: 80,
});
// Returns: "url1 320w, url2 640w, url3 960w, url4 1280w"
```

### getPlaceholder(src, width?)

Generate a low-quality blur placeholder for LQIP.

```ts
const placeholder = getPlaceholder(imageUrl, 40);
```

## CDN Providers

### Cloudinary

**Pros:** Easy setup, generous free tier (25 GB/month), extensive features  
**Setup:** Sign up at [cloudinary.com](https://cloudinary.com), get Cloud Name

### Cloudflare Images

**Pros:** Fast, affordable ($5/mo for 100k images), global CDN  
**Setup:** Enable Cloudflare Images, get Account Hash

### imgproxy

**Pros:** Self-hosted, complete control, privacy-friendly  
**Setup:** Deploy imgproxy with Docker, configure URL and keys

### Local

**Pros:** No setup needed, works offline  
**Cons:** No optimization, development only

## Documentation

See [docs/cdn-image-optimization.md](../../docs/cdn-image-optimization.md) for detailed setup guide.

## License

Part of bhvr-ecom monorepo - see root LICENSE file.
