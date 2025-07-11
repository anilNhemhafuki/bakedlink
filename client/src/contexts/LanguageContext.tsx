import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ne';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Common
    dashboard: "Dashboard",
    products: "Products",
    inventory: "Inventory", 
    stock: "Stock",
    orders: "Orders",
    production: "Production",
    parties: "Parties",
    customers: "Customers",
    assets: "Assets",
    expenses: "Expenses",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
    search: "Search",
    dayBook: "Day Book",
    transactions: "Transactions",
    billing: "Billing",
    notifications: "Notifications",
    userManagement: "User Management",
    loginLogs: "Login Logs",
    categoryManagement: "Category Management",
    sales: "Sales",
    purchases: "Purchases",
    ingredients: "Ingredients",
    units: "Units",
    admin: "Admin",
    manager: "Manager",
    staff: "Staff",
    // Add more translations as needed
  },
  ne: {
    // Common  
    dashboard: "ड्यासबोर्ड",
    products: "उत्पादनहरू",
    inventory: "सूची",
    stock: "स्टक",
    orders: "अर्डरहरू", 
    production: "उत्पादन",
    parties: "पार्टीहरू",
    customers: "ग्राहकहरू",
    assets: "सम्पत्तिहरू",
    expenses: "खर्चहरू",
    reports: "रिपोर्टहरू",
    settings: "सेटिङहरू",
    logout: "लगआउट",
    search: "खोज्नुहोस्",
    dayBook: "दिन पुस्तक",
    transactions: "लेनदेनहरू",
    billing: "बिलिङ",
    notifications: "सूचनाहरू",
    userManagement: "प्रयोगकर्ता व्यवस्थापन",
    loginLogs: "लगिन लगहरू",
    categoryManagement: "वर्ग व्यवस्थापन",
    sales: "बिक्री",
    purchases: "खरिदहरू",
    ingredients: "सामग्रीहरू",
    units: "एकाइहरू",
    admin: "प्रशासक",
    manager: "व्यवस्थापक", 
    staff: "कर्मचारी",
    // Add more translations as needed
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}