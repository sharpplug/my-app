
"use client";

import Link from "next/link";
import { MessageSquare, Camera } from "lucide-react";
import { Button } from "../ui/button";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
        <defs>
            <linearGradient id="fire-header" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#FF4848'}} />
                <stop offset="100%" style={{stopColor: '#FACC15'}} />
            </linearGradient>
            <linearGradient id="water-header" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#22D3EE'}} />
                <stop offset="100%" style={{stopColor: '#3B82F6'}} />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#fire-header)" />
        <path d="M12 2a10 10 0 0 0 0 20c3.5 0 6.6-1.8 8.4-4.5a.5.5 0 0 1 .1-.5 8 8 0 0 0-15-5 .5.5 0 0 1 .2-1A10 10 0 0 1 12 2Z" fill="url(#water-header)" />
        <path d="M5.9 12.5a.5.5 0 0 0-.2 1 8 8 0 0 1 15 5 .5.5 0 0 0-.1.5A10 10 0 0 1 4 12c0-.8.1-1.6.4-2.3a.5.5 0 0 0-.3-.9ZM18.1 11.5a.5.5 0 0 0 .2-1 8 8 0 0 1-15-5A.5.5 0 0 0 3.4 6 10 10 0 0 1 20 12c0 .8-.1-1.6-.4 2.3a.5.5 0 0 0 .3.9Z" stroke="hsl(var(--background))" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

export default function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
       <Link href="/vibes" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
           <h1 className="text-xl font-body font-bold">
               <span className="bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
                    Moood
               </span>
           </h1>
        </Link>
    </header>
  );
}
