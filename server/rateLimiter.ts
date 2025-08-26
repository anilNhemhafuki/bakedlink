
// Rate limiting utilities for enhanced security
export const rateLimitStore = new Map<string, number>();

export function rateLimitKey(ip: string, identifier?: string): string {
  return identifier ? `${ip}:${identifier}` : ip;
}

export function submissionStart(): number {
  return Date.now();
}

export function submissionTimestamp(): string {
  return new Date().toISOString();
}

export function clientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         '127.0.0.1';
}

export function userAgent(req: any): string {
  return req.get('User-Agent') || '';
}

export function referenceId(): string {
  return `REF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}

export function formVersion(): string {
  return '1.0';
}

export function attachments(files: File[] = []): any[] {
  return files.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  }));
}

// Rate limiting check
export function checkRateLimit(key: string, windowMs: number = 60000, maxRequests: number = 5): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Clean old entries
  for (const [k, timestamp] of rateLimitStore.entries()) {
    if (timestamp < windowStart) {
      rateLimitStore.delete(k);
    }
  }
  
  // Count requests in current window
  let requestCount = 0;
  for (const [k, timestamp] of rateLimitStore.entries()) {
    if (k.startsWith(key) && timestamp >= windowStart) {
      requestCount++;
    }
  }
  
  if (requestCount >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  rateLimitStore.set(`${key}:${now}`, now);
  return true;
}
