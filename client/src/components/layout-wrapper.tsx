
import React from "react";

interface LayoutWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export default function LayoutWrapper({ 
  children, 
  title, 
  description, 
  className = "" 
}: LayoutWrapperProps) {
  return (
    <div className={`min-h-full ${className}`}>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-lg text-gray-600">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
