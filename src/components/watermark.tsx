
"use client";

import { cn } from "@/lib/utils";
import React from "react";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
        <defs>
            <linearGradient id="fire-watermark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#FF4848'}} />
                <stop offset="100%" style={{stopColor: '#FACC15'}} />
            </linearGradient>
            <linearGradient id="water-watermark" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#22D3EE'}} />
                <stop offset="100%" style={{stopColor: '#3B82F6'}} />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#fire-watermark)" />
        <path d="M12 2a10 10 0 0 0 0 20c3.5 0 6.6-1.8 8.4-4.5a.5.5 0 0 1 .1-.5 8 8 0 0 0-15-5 .5.5 0 0 1 .2-1A10 10 0 0 1 12 2Z" fill="url(#water-watermark)" />
    </svg>
);


export const Watermark = ({ user, className }: { user?: { name: string }, className?: string }) => (
    <div className={cn("absolute bottom-2 left-2 flex items-center gap-1.5 p-1 rounded-full bg-black/20 backdrop-blur-sm pointer-events-none", className)}>
        <Logo className="w-4 h-4" />
        <span className="text-white font-bold text-[10px] pr-1">
            Moood {user ? `• @${user.name.toLowerCase().replace(/\s/g, '')}` : ''}
        </span>
    </div>
);
