
import type { Request, Response, NextFunction } from "express";
import { storage } from "./lib/storage";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  filterSuperAdmin?: boolean;
}

export function requirePermission(resource: string, action: 'read' | 'write' | 'read_write') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Super admin always has access to everything
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Admin has access to most things but never to superadmin-related functionality
      if (req.user.role === 'admin' && resource !== 'super_admin') {
        return next();
      }

      const hasPermission = await storage.checkUserPermission(req.user.id, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: "Insufficient permissions",
          required: `${action} access to ${resource}` 
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
}

export function requireRead(resource: string) {
  return requirePermission(resource, 'read');
}

export function requireWrite(resource: string) {
  return requirePermission(resource, 'write');
}

export function requireReadWrite(resource: string) {
  return requirePermission(resource, 'read_write');
}

export function requireSuperAdmin() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: "Super admin access required" 
      });
    }

    next();
  };
}

export function filterSuperAdminUsers() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Add a flag to indicate we need to filter superadmin users
    req.filterSuperAdmin = req.user?.role !== 'super_admin';
    next();
  };
}
