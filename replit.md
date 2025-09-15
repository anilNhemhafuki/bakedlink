# Mero BakeSoft - Bakery Management System

## Overview

A comprehensive bakery management system built with React, TypeScript, and PostgreSQL. The application provides complete business management functionality for bakeries including product management, inventory tracking, order processing, production scheduling, and financial operations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom bakery theme
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and bcrypt
- **Session Management**: Express session with PostgreSQL store
- **API Design**: RESTful endpoints with role-based access control

### Database Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle migrations with version control
- **Connection**: Neon serverless PostgreSQL or standard PostgreSQL
- **Session Storage**: connect-pg-simple for Express sessions

## Key Components

### Core Management Modules
1. **Dashboard**: Real-time analytics, sales metrics, and operational overview
2. **Products**: Product catalog with categories, pricing, and cost calculation
3. **Inventory**: Raw materials tracking with stock levels and alerts
4. **Orders**: Customer order processing with status tracking
5. **Production**: Scheduling and batch production management
6. **Sales**: Transaction recording and revenue tracking
7. **Purchases**: Supplier management and inventory restocking

### Business Operations
1. **Customer Management**: CRM functionality for customer relationships
2. **Supplier/Party Management**: Vendor and supplier database
3. **Asset Management**: Equipment and business asset tracking
4. **Expense Tracking**: Business cost monitoring and categorization
5. **Billing**: Invoice generation and payment processing

### Advanced Features
1. **User Management**: Role-based access (Super Admin, Admin, Manager, Staff)
2. **Category Management**: Hierarchical organization system
3. **Currency Support**: Multi-currency with formatting utilities
4. **Notifications**: Push notification system for alerts
5. **Reports & Analytics**: Business intelligence and insights
6. **Theme Customization**: Dynamic color theming system
7. **Unit Conversion System**: Advanced unit conversion with cost calculations
8. **Cost Calculation Engine**: Automatic product cost calculation based on ingredient units
9. **Interactive Table Sorting**: Comprehensive column sorting with visual indicators across all listing pages

## Data Flow

### Authentication Flow
1. User credentials validated against bcrypt-hashed passwords
2. Passport.js creates authenticated session
3. Session stored in PostgreSQL with automatic expiration
4. Role-based route protection via middleware

### Data Management Flow
1. Client components use TanStack Query for server state
2. API requests routed through Express.js endpoints
3. Drizzle ORM handles database operations with type safety
4. Real-time updates via query invalidation and optimistic updates

### Production Workflow
1. Products defined with ingredient relationships
2. Production schedules created with target quantities
3. Inventory automatically updated based on production consumption
4. Cost calculations based on ingredient prices and overhead

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe database operations
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **passport**: Authentication middleware
- **bcrypt**: Password hashing
- **express-session**: Session management

### UI Dependencies
- **@radix-ui/***: Primitive UI components
- **tailwindcss**: Utility-first CSS framework
- **react-hook-form**: Form state management
- **zod**: Schema validation
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **drizzle-kit**: Database migration tools
- **esbuild**: Production bundling

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend
- tsx for TypeScript execution in development
- Automatic database initialization with default users
- Replit-specific optimizations and error handling

### Production Build
1. Vite builds optimized client bundle to `dist/public`
2. esbuild bundles server code to `dist/index.js`
3. Express serves static files in production mode
4. Database migrations run automatically on startup

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SESSION_SECRET**: Session encryption key
- **NODE_ENV**: Environment flag (development/production)
- **PORT**: Server port (default: 5000)

### Default User Accounts
- **Admin**: admin@sweetreats.com / admin123 (Full access)
- **Manager**: manager@sweetreats.com / manager123 (Management features)
- **Staff**: staff@sweetreats.com / staff123 (Basic operations)

Changelog:
- June 24, 2025. Initial setup
- July 9, 2025. Implemented comprehensive theme color system with database integration
- July 9, 2025. Added login tracking system with IP address, location, and device tracking
- July 9, 2025. Enhanced UI/UX with consistent theme color application across all components
- July 9, 2025. Added theme-aware badge system and improved user interface consistency
- July 11, 2025. Added unit conversion system with database tables and API endpoints
- July 11, 2025. Implemented cost calculation system for products based on unit conversions
- July 11, 2025. Enhanced super admin role with full access to all system resources
- July 11, 2025. Added reusable SearchBar component across all 17 pages
- July 25, 2025. Implemented comprehensive interactive table sorting functionality across all listing pages with clickable column headers, ascending/descending toggle, and visual sort indicators
- July 29, 2025. Successfully migrated from Replit Agent to standard Replit environment with PostgreSQL database provisioning, schema migrations, and unit system fixes
- August 28, 2025. Completed full migration to Replit environment - resolved all 137 TypeScript diagnostics, fixed staff management system, added missing storage methods (getAssetById, getPartyById), corrected authentication interfaces, and ensured all 6 staff management subcategories are fully operational

User Preferences:
Preferred communication style: Simple, everyday language.
Theme system: Dynamic theme colors from database with comprehensive UI integration.