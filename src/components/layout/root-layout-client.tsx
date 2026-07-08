'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/language-provider';
import { AuthProvider } from '@/contexts/auth-provider';
import { DynamicThemeProvider } from '@/contexts/theme-provider';
import { Toaster } from '@/components/ui/toaster';

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (language) {
      const dir = language === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
    }
  }, [language]);

  return (
    <AuthProvider>
      <DynamicThemeProvider>
        <div className={mounted ? 'opacity-100 transition-opacity duration-300' : 'opacity-0'}>
          {children}
        </div>
        <Toaster />
      </DynamicThemeProvider>
    </AuthProvider>
  );
}
