import { Request } from 'express';
import { db } from '../db';
import { auditLogs } from '@shared/schema';

export async function trackUserActivity(
  userId: number,
  userEmail: string,
  action: string,
  resource: string,
  resourceId: string,
  details: any,
  req?: Request
) {
  try {
    await db.insert(auditLogs).values({
      userId,
      userEmail,
      action,
      resource,
      resourceId,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.get('User-Agent') || 'unknown',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to track user activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
}