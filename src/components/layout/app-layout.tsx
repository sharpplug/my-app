"use client";

import React from 'react';
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2 } from "lucide-react";
import dynamic from 'next/dynamic';

const DesktopLayout = dynamic(() => import('./desktop-layout'), { 
  loading: () => <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>,
  ssr: false 
});

const MobileLayout = dynamic(() => import('./mobile-layout'), { 
  loading: () => <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>,
  ssr: false 
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  // Show a loading spinner until we know the device type
  if (isMobile === undefined) {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
    );
  }
  
  return (
    <>
      {isMobile ? (
        <MobileLayout>{children}</MobileLayout>
      ) : (
        <DesktopLayout>{children}</DesktopLayout>
      )}
    </>
  );
}
