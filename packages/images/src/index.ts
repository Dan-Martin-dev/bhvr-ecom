/**
 * Image optimization and CDN utilities
 * 
 * Supports multiple CDN providers:
 * - Cloudinary
 * - Cloudflare Images
 * - Self-hosted with imgproxy
 * - Local development (passthrough)
 */

import { env as serverEnv } from "@bhvr-ecom/env/server";

// ============================================================================
// Types
// ============================================================================

export type ImageFormat = "webp" | "avif" | "jpg" | "png" | "auto";
export type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";
export type ImageGravity = "center" | "north" | "south" | "east" | "west" | "auto" | "face";

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: ImageFormat;
  fit?: ImageFit;
  gravity?: ImageGravity;
  blur?: number; // For placeholder images
  dpr?: 1 | 2 | 3; // Device pixel ratio
}

export interface ResponsiveImageConfig {
  src: string;
  widths: number[]; // e.g., [320, 640, 960, 1280, 1920]
  sizes?: string; // CSS sizes attribute
  format?: ImageFormat;
  quality?: number;
}

export interface ImageUrlGeneratorConfig {
  cdnProvider: "cloudinary" | "cloudflare" | "imgproxy" | "local";
  cloudinaryCloudName?: string;
  cloudflareAccountHash?: string;
  imgproxyUrl?: string;
  imgproxyKey?: string;
  imgproxySalt?: string;
}

// ============================================================================
// CDN Provider Implementations
// ============================================================================

/**
 * Cloudinary URL generator
 * Docs: https://cloudinary.com/documentation/image_transformations
 */
function generateCloudinaryUrl(
  src: string,
  options: ImageTransformOptions,
  cloudName: string,
): string {
  const transformations: string[] = [];

  if (options.width || options.height) {
    const w = options.width ? `w_${options.width}` : "";
    const h = options.height ? `h_${options.height}` : "";
    const fit = options.fit ? `,c_${options.fit}` : ",c_fill";
    const gravity = options.gravity ? `,g_${options.gravity}` : "";
    transformations.push(`${w}${h ? `,${h}` : ""}${fit}${gravity}`);
  }

  if (options.quality) {
    transformations.push(`q_${options.quality}`);
  }

  if (options.format && options.format !== "auto") {
    transformations.push(`f_${options.format}`);
  } else {
    transformations.push("f_auto"); // Automatic format selection
  }

  if (options.blur) {
    transformations.push(`e_blur:${options.blur}`);
  }

  if (options.dpr) {
    transformations.push(`dpr_${options.dpr}`);
  }

  const transformation = transformations.join(",");
  
  // Handle both Cloudinary URLs and external URLs
  if (src.includes("cloudinary.com")) {
    // Already a Cloudinary URL, insert transformation
    return src.replace("/upload/", `/upload/${transformation}/`);
  }

  // External URL - use fetch mode
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformation}/${encodeURIComponent(src)}`;
}

/**
 * Cloudflare Images URL generator
 * Docs: https://developers.cloudflare.com/images/transform-images/
 */
function generateCloudflareUrl(
  src: string,
  options: ImageTransformOptions,
  accountHash: string,
): string {
  const params: string[] = [];

  if (options.width) {
    params.push(`width=${options.width}`);
  }

  if (options.height) {
    params.push(`height=${options.height}`);
  }

  if (options.quality) {
    params.push(`quality=${options.quality}`);
  }

  if (options.format && options.format !== "auto") {
    params.push(`format=${options.format}`);
  } else {
    params.push("format=auto"); // Automatic format selection
  }

  if (options.fit) {
    params.push(`fit=${options.fit}`);
  }

  if (options.gravity) {
    params.push(`gravity=${options.gravity}`);
  }

  if (options.blur) {
    params.push(`blur=${options.blur}`);
  }

  if (options.dpr) {
    params.push(`dpr=${options.dpr}`);
  }

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  
  // Cloudflare Images expects image ID or variant URL
  if (src.startsWith("http")) {
    // External URL - needs to be uploaded first or use fetch API
    return `https://imagedelivery.net/${accountHash}/fetch/${encodeURIComponent(src)}${queryString}`;
  }

  // Image ID
  return `https://imagedelivery.net/${accountHash}/${src}${queryString}`;
}

/**
 * imgproxy URL generator (self-hosted option)
 * Docs: https://docs.imgproxy.net/generating_the_url
 */
function generateImgproxyUrl(
  src: string,
  options: ImageTransformOptions,
  baseUrl: string,
): string {
  const parts: string[] = [];

  // Resize
  if (options.width || options.height) {
    const w = options.width || 0;
    const h = options.height || 0;
    const fit = options.fit || "fill";
    parts.push(`resize:${fit}:${w}:${h}:0`);
  }

  // Quality
  if (options.quality) {
    parts.push(`quality:${options.quality}`);
  }

  // Format
  if (options.format && options.format !== "auto") {
    parts.push(`format:${options.format}`);
  }

  // Gravity
  if (options.gravity) {
    parts.push(`gravity:${options.gravity}`);
  }

  // Blur
  if (options.blur) {
    parts.push(`blur:${options.blur}`);
  }

  // DPR
  if (options.dpr) {
    parts.push(`dpr:${options.dpr}`);
  }

  const processing = parts.join("/");
  const encodedUrl = Buffer.from(src).toString("base64url");
  
  return `${baseUrl}/${processing}/${encodedUrl}`;
}

/**
 * Local development passthrough (no CDN)
 */
function generateLocalUrl(src: string, _options: ImageTransformOptions): string {
  return src; // No transformation in local mode
}

// ============================================================================
// Main Image Service
// ============================================================================

export class ImageService {
  private config: ImageUrlGeneratorConfig;

  constructor(config?: Partial<ImageUrlGeneratorConfig>) {
    // Auto-detect CDN provider from environment
    this.config = {
      cdnProvider: this.detectCdnProvider(),
      cloudinaryCloudName: serverEnv.CLOUDINARY_CLOUD_NAME,
      cloudflareAccountHash: serverEnv.CLOUDFLARE_ACCOUNT_HASH,
      imgproxyUrl: serverEnv.IMGPROXY_URL,
      imgproxyKey: serverEnv.IMGPROXY_KEY,
      imgproxySalt: serverEnv.IMGPROXY_SALT,
      ...config,
    };
  }

  /**
   * Auto-detect CDN provider from environment variables
   */
  private detectCdnProvider(): ImageUrlGeneratorConfig["cdnProvider"] {
    if (serverEnv.CLOUDINARY_CLOUD_NAME) return "cloudinary";
    if (serverEnv.CLOUDFLARE_ACCOUNT_HASH) return "cloudflare";
    if (serverEnv.IMGPROXY_URL) return "imgproxy";
    return "local";
  }

  /**
   * Generate optimized image URL
   */
  getImageUrl(src: string, options: ImageTransformOptions = {}): string {
    if (!src) return "";

    // Default options
    const opts: ImageTransformOptions = {
      format: "auto",
      quality: 80,
      fit: "cover",
      gravity: "auto",
      ...options,
    };

    switch (this.config.cdnProvider) {
      case "cloudinary":
        if (!this.config.cloudinaryCloudName) {
          console.warn("Cloudinary cloud name not configured, using original URL");
          return src;
        }
        return generateCloudinaryUrl(src, opts, this.config.cloudinaryCloudName);

      case "cloudflare":
        if (!this.config.cloudflareAccountHash) {
          console.warn("Cloudflare account hash not configured, using original URL");
          return src;
        }
        return generateCloudflareUrl(src, opts, this.config.cloudflareAccountHash);

      case "imgproxy":
        if (!this.config.imgproxyUrl) {
          console.warn("imgproxy URL not configured, using original URL");
          return src;
        }
        return generateImgproxyUrl(src, opts, this.config.imgproxyUrl);

      case "local":
      default:
        return generateLocalUrl(src, opts);
    }
  }

  /**
   * Generate responsive image srcset
   */
  getResponsiveSrcset(config: ResponsiveImageConfig): string {
    const { src, widths, format, quality } = config;

    return widths
      .map((width) => {
        const url = this.getImageUrl(src, { width, format, quality });
        return `${url} ${width}w`;
      })
      .join(", ");
  }

  /**
   * Generate blur placeholder for LQIP (Low Quality Image Placeholder)
   */
  getPlaceholder(src: string, width = 40): string {
    return this.getImageUrl(src, {
      width,
      quality: 10,
      blur: 20,
      format: "jpg",
    });
  }

  /**
   * Get product image URL (helper for common use case)
   */
  getProductImageUrl(
    src: string,
    size: "thumb" | "small" | "medium" | "large" | "original" = "medium",
  ): string {
    const sizeMap = {
      thumb: { width: 150, height: 150 },
      small: { width: 300, height: 300 },
      medium: { width: 600, height: 600 },
      large: { width: 1200, height: 1200 },
      original: {},
    };

    return this.getImageUrl(src, {
      ...sizeMap[size],
      format: "auto",
      quality: 85,
      fit: "cover",
    });
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const imageService = new ImageService();

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Generate optimized image URL (convenience wrapper)
 */
export function getImageUrl(src: string, options?: ImageTransformOptions): string {
  return imageService.getImageUrl(src, options);
}

/**
 * Generate responsive srcset (convenience wrapper)
 */
export function getResponsiveSrcset(config: ResponsiveImageConfig): string {
  return imageService.getResponsiveSrcset(config);
}

/**
 * Generate blur placeholder (convenience wrapper)
 */
export function getPlaceholder(src: string, width?: number): string {
  return imageService.getPlaceholder(src, width);
}

/**
 * Get product image URL (convenience wrapper)
 */
export function getProductImageUrl(
  src: string,
  size?: "thumb" | "small" | "medium" | "large" | "original",
): string {
  return imageService.getProductImageUrl(src, size);
}
