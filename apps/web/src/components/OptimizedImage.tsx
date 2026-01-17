/**
 * OptimizedImage Component
 * 
 * Provides automatic CDN-backed image optimization with:
 * - Responsive images (srcset)
 * - Lazy loading
 * - Blur-up placeholders (LQIP)
 * - Automatic format selection (WebP/AVIF)
 * - Error handling with fallback
 */

import { useState, type ImgHTMLAttributes } from "react";
import { getImageUrl, getResponsiveSrcset, getPlaceholder } from "@bhvr-ecom/images/client";

export interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  sizes?: string;
  responsive?: boolean;
  responsiveWidths?: number[];
  placeholder?: boolean;
  fallbackSrc?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 85,
  sizes,
  responsive = false,
  responsiveWidths = [320, 640, 960, 1280, 1920],
  placeholder = true,
  fallbackSrc,
  objectFit = "cover",
  className = "",
  loading = "lazy",
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Use fallback if error or no src
  const finalSrc = imageError && fallbackSrc ? fallbackSrc : src;

  // Generate optimized URLs
  const optimizedSrc = getImageUrl(finalSrc, {
    width,
    height,
    quality,
    format: "auto",
    fit: objectFit === "cover" || objectFit === "contain" ? objectFit : "cover",
  });

  const srcSet = responsive
    ? getResponsiveSrcset({
        src: finalSrc,
        widths: responsiveWidths,
        quality,
      })
    : undefined;

  const placeholderSrc = placeholder ? getPlaceholder(finalSrc) : undefined;

  // Calculate aspect ratio for container
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        paddingBottom: aspectRatio ? `${aspectRatio}%` : undefined,
      }}
    >
      {/* Placeholder blur-up image */}
      {placeholder && placeholderSrc && !imageLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit,
            filter: "blur(20px)",
            transform: "scale(1.1)",
          }}
        />
      )}

      {/* Main optimized image */}
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        className={`${aspectRatio ? "absolute inset-0" : ""} w-full h-full transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          objectFit,
        }}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        {...props}
      />
    </div>
  );
}

/**
 * ProductImage Component
 * Pre-configured for product images with common sizes
 */
export interface ProductImageProps extends Omit<OptimizedImageProps, "responsive" | "responsiveWidths" | "sizes"> {
  size?: "thumb" | "small" | "medium" | "large";
}

export function ProductImage({
  src,
  alt,
  size = "medium",
  className = "",
  ...props
}: ProductImageProps) {
  const sizeMap = {
    thumb: { width: 150, height: 150, widths: [150, 300] },
    small: { width: 300, height: 300, widths: [300, 600] },
    medium: { width: 600, height: 600, widths: [600, 1200] },
    large: { width: 1200, height: 1200, widths: [1200, 2400] },
  };

  const config = sizeMap[size];

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={config.width}
      height={config.height}
      responsive
      responsiveWidths={config.widths}
      sizes={`(max-width: ${config.width}px) 100vw, ${config.width}px`}
      className={className}
      {...props}
    />
  );
}

/**
 * CategoryImage Component
 * Pre-configured for category banner images
 */
export interface CategoryImageProps extends Omit<OptimizedImageProps, "responsive" | "responsiveWidths" | "sizes"> {}

export function CategoryImage({ src, alt, className = "", ...props }: CategoryImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1200}
      height={400}
      responsive
      responsiveWidths={[640, 960, 1280, 1920]}
      sizes="100vw"
      className={className}
      objectFit="cover"
      {...props}
    />
  );
}
