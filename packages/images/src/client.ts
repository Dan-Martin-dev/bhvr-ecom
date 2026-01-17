/**
 * Client-side image optimization utilities
 * 
 * Provides CDN-backed image transformations for the web app
 */

import { env } from "@bhvr-ecom/env/web";

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

// ============================================================================
// CDN URL Generators (client-side implementations)
// ============================================================================

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
    transformations.push("f_auto");
  }

  if (options.blur) {
    transformations.push(`e_blur:${options.blur}`);
  }

  if (options.dpr) {
    transformations.push(`dpr_${options.dpr}`);
  }

  const transformation = transformations.join(",");
  
  if (src.includes("cloudinary.com")) {
    return src.replace("/upload/", `/upload/${transformation}/`);
  }

  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformation}/${encodeURIComponent(src)}`;
}

function generateCloudflareUrl(
  src: string,
  options: ImageTransformOptions,
  accountHash: string,
): string {
  const params: string[] = [];

  if (options.width) params.push(`width=${options.width}`);
  if (options.height) params.push(`height=${options.height}`);
  if (options.quality) params.push(`quality=${options.quality}`);
  if (options.format && options.format !== "auto") {
    params.push(`format=${options.format}`);
  } else {
    params.push("format=auto");
  }
  if (options.fit) params.push(`fit=${options.fit}`);
  if (options.gravity) params.push(`gravity=${options.gravity}`);
  if (options.blur) params.push(`blur=${options.blur}`);
  if (options.dpr) params.push(`dpr=${options.dpr}`);

  const queryString = params.length > 0 ? `?${params.join("&")}` : "";
  
  if (src.startsWith("http")) {
    return `https://imagedelivery.net/${accountHash}/fetch/${encodeURIComponent(src)}${queryString}`;
  }

  return `https://imagedelivery.net/${accountHash}/${src}${queryString}`;
}

function generateImgproxyUrl(
  src: string,
  options: ImageTransformOptions,
  baseUrl: string,
): string {
  const parts: string[] = [];

  if (options.width || options.height) {
    const w = options.width || 0;
    const h = options.height || 0;
    const fit = options.fit || "fill";
    parts.push(`resize:${fit}:${w}:${h}:0`);
  }

  if (options.quality) parts.push(`quality:${options.quality}`);
  if (options.format && options.format !== "auto") parts.push(`format:${options.format}`);
  if (options.gravity) parts.push(`gravity:${options.gravity}`);
  if (options.blur) parts.push(`blur:${options.blur}`);
  if (options.dpr) parts.push(`dpr:${options.dpr}`);

  const processing = parts.join("/");
  const encodedUrl = btoa(src).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  
  return `${baseUrl}/${processing}/${encodedUrl}`;
}

function generateLocalUrl(src: string): string {
  return src; // No transformation in local mode
}

// ============================================================================
// Client Image Service
// ============================================================================

class ClientImageService {
  private cdnProvider: string;
  private cloudinaryCloudName?: string;
  private cloudflareAccountHash?: string;
  private imgproxyUrl?: string;

  constructor() {
    this.cdnProvider = env.VITE_CDN_PROVIDER || "local";
    this.cloudinaryCloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
    this.cloudflareAccountHash = env.VITE_CLOUDFLARE_ACCOUNT_HASH;
    this.imgproxyUrl = env.VITE_IMGPROXY_URL;
  }

  /**
   * Generate optimized image URL
   */
  getImageUrl(src: string, options: ImageTransformOptions = {}): string {
    if (!src) return "";

    const opts: ImageTransformOptions = {
      format: "auto",
      quality: 80,
      fit: "cover",
      gravity: "auto",
      ...options,
    };

    switch (this.cdnProvider) {
      case "cloudinary":
        if (!this.cloudinaryCloudName) return src;
        return generateCloudinaryUrl(src, opts, this.cloudinaryCloudName);

      case "cloudflare":
        if (!this.cloudflareAccountHash) return src;
        return generateCloudflareUrl(src, opts, this.cloudflareAccountHash);

      case "imgproxy":
        if (!this.imgproxyUrl) return src;
        return generateImgproxyUrl(src, opts, this.imgproxyUrl);

      case "local":
      default:
        return generateLocalUrl(src);
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

  /**
   * Check if CDN is enabled
   */
  isCdnEnabled(): boolean {
    return this.cdnProvider !== "local";
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const imageService = new ClientImageService();

// ============================================================================
// Helper functions
// ============================================================================

export function getImageUrl(src: string, options?: ImageTransformOptions): string {
  return imageService.getImageUrl(src, options);
}

export function getResponsiveSrcset(config: ResponsiveImageConfig): string {
  return imageService.getResponsiveSrcset(config);
}

export function getPlaceholder(src: string, width?: number): string {
  return imageService.getPlaceholder(src, width);
}

export function getProductImageUrl(
  src: string,
  size?: "thumb" | "small" | "medium" | "large" | "original",
): string {
  return imageService.getProductImageUrl(src, size);
}

export function isCdnEnabled(): boolean {
  return imageService.isCdnEnabled();
}
