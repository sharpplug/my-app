
'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';

export type Region = 'AE' | 'KE' | 'UG' | 'ZA';
export type Language = 'en' | 'ar';

interface RegionalContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  region: Region;
  setRegion: (region: Region) => void;
  currency: { symbol: string, code: string };
  t: (key: any) => string;
  isMounted: boolean;
  dataSaver: boolean;
  setDataSaver: (enabled: boolean) => void;
}

const translations: Record<Language, any> = { en, ar };

const regionConfigs: Record<Region, { symbol: string, code: string, name: string }> = {
  AE: { symbol: 'Dhs.', code: 'AED', name: 'UAE' },
  KE: { symbol: 'KSh', code: 'KES', name: 'Kenya' },
  UG: { symbol: 'USh', code: 'UGX', name: 'Uganda' },
  ZA: { symbol: 'R', code: 'ZAR', name: 'South Africa' },
};

const RegionalContext = createContext<RegionalContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [region, setRegion] = useState<Region>('AE');
  const [dataSaver, setDataSaver] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const storedLang = localStorage.getItem('moood-lang') as Language;
    const storedRegion = localStorage.getItem('moood-region') as Region;
    const storedDataSaver = localStorage.getItem('moood-datasaver') === 'true';

    if (storedLang && ['en', 'ar'].includes(storedLang)) setLanguage(storedLang);
    if (storedRegion && regionConfigs[storedRegion]) setRegion(storedRegion);
    setDataSaver(storedDataSaver);
    
    setIsMounted(true);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('moood-lang', lang);
  };

  const handleSetRegion = (reg: Region) => {
    setRegion(reg);
    localStorage.setItem('moood-region', reg);
  };

  const handleSetDataSaver = (enabled: boolean) => {
    setDataSaver(enabled);
    localStorage.setItem('moood-datasaver', enabled.toString());
  };
  
  const t = useCallback((key: string): string => {
      if (!isMounted) return key;
      return translations[language][key] || translations['en'][key] || key;
  }, [language, isMounted]);

  const currency = regionConfigs[region];

  const value = {
    language,
    setLanguage: handleSetLanguage,
    region,
    setRegion: handleSetRegion,
    currency,
    t,
    isMounted,
    dataSaver,
    setDataSaver: handleSetDataSaver,
  };
  
  return (
    <RegionalContext.Provider value={value}>
      {children}
    </RegionalContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(RegionalContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useRegional() {
    return useLanguage();
}
