import { HeaderConfig } from './header.interface';
import { DEFAULT_HEADER_CONFIG } from './header.constants';

/**
 * Helper to merge partial header config with default values
 */
export const mergeWithDefaultConfig = (partialConfig: Partial<HeaderConfig>): HeaderConfig => {
  return {
    ...DEFAULT_HEADER_CONFIG,
    ...partialConfig,
    // Handle nested objects
    gradientColors: {
      ...DEFAULT_HEADER_CONFIG.gradientColors,
      ...partialConfig.gradientColors,
    },
    imagePosition: {
      ...DEFAULT_HEADER_CONFIG.imagePosition,
      ...partialConfig.imagePosition,
    },
    festivalDates: {
      ...DEFAULT_HEADER_CONFIG.festivalDates,
      ...partialConfig.festivalDates,
    },
    socialLinks: {
      ...DEFAULT_HEADER_CONFIG.socialLinks,
      ...partialConfig.socialLinks,
    },
    customStyles: {
      ...DEFAULT_HEADER_CONFIG.customStyles,
      ...partialConfig.customStyles,
    },
    interactions: {
      ...DEFAULT_HEADER_CONFIG.interactions,
      ...partialConfig.interactions,
    },
  };
};

/**
 * Validate header configuration
 * Returns string with error message if invalid, null if valid
 */
export const validateHeader = (header: HeaderConfig): string | null => {
  // Check required fields based on type
  if (header.type === 'image' && !header.imageUrl) {
    return 'Image URL is required for image header type';
  }
  
  if (header.type === 'logo' && !header.logoUrl) {
    return 'Logo URL is required for logo header type';
  }
  
  if (header.type === 'gradient' && (!header.gradientColors?.from || !header.gradientColors?.to)) {
    return 'Gradient colors are required for gradient header type';
  }

  // Check dates if showDates is true
  if (header.showDates && (!header.festivalDates?.start || !header.festivalDates?.end)) {
    return 'Start and end dates are required when dates are shown';
  }
  
  // Check if end date is after start date
  if (header.festivalDates?.start && header.festivalDates?.end) {
    const startDate = new Date(header.festivalDates.start);
    const endDate = new Date(header.festivalDates.end);
    if (endDate < startDate) {
      return 'End date must be after start date';
    }
  }
  
  return null; // No validation errors
};

/**
 * Sanitize input to prevent malicious data
 */
export const sanitizeHeader = (header: HeaderConfig): HeaderConfig => {
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(header));
  
  // Sanitize URLs to prevent XSS and other security issues
  if (sanitized.imageUrl) {
    sanitized.imageUrl = sanitizeUrl(sanitized.imageUrl);
  }
  
  if (sanitized.logoUrl) {
    sanitized.logoUrl = sanitizeUrl(sanitized.logoUrl);
  }
  
  // Sanitize social media links
  if (sanitized.socialLinks) {
    for (const [platform, url] of Object.entries(sanitized.socialLinks)) {
      if (url) {
        sanitized.socialLinks[platform] = sanitizeUrl(url as string);
      }
    }
  }
  
  return sanitized;
};

/**
 * Helper to sanitize a URL string
 * This is a simple implementation - consider using a dedicated library for production
 */
const sanitizeUrl = (url: string): string => {
  // Ensure URL has a valid protocol
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  
  // Basic URL sanitization
  return url.replace(/[<>]/g, '');
};