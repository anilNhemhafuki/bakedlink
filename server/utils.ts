
// Server utility functions
export function sanitizeInput(input: string | undefined): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length to prevent overflow
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

export function generateSecureId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${prefix}${timestamp}${randomPart}`.toUpperCase();
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function formatError(error: any): string {
  if (error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export function logSecurityEvent(event: string, details: any) {
  console.warn(`🚨 SECURITY EVENT: ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}
