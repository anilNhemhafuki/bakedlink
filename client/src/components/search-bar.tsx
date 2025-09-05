"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

// ✅ Named export — make sure this matches the import
export function SearchBar({
  placeholder = "Search...",
  onSearch,
  className = "",
  value,
  onChange,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(value || "");

  // Use external value if provided (controlled), otherwise use internal state
  const currentValue = value !== undefined ? value : internalValue;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(currentValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue); // only update internal if uncontrolled
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange("");
    } else {
      setInternalValue("");
    }
    onSearch?.("");
  };

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="relative flex items-center">
        {/* Search Icon */}
        <Search className="absolute left-3 h-4 w-4 text-gray-400 pointer-events-none" />

        {/* Input */}
        <Input
          type="search"
          placeholder={placeholder}
          value={currentValue}
          onChange={handleChange}
          className="pl-10 pr-10 py-2 w-full"
          aria-label={placeholder}
        />

        {/* Clear Button */}
        {currentValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 h-8 w-8 p-0 hover:bg-gray-100"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

// ✅ Default export to fix import issues
export default SearchBar;
