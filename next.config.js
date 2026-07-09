// Firebase Auth's popup/redirect sign-in, Firestore's streaming connection,
// Gemini's image responses, and the Leaflet/OpenStreetMap tiles used by the
// Vibes Map & Skip map all need specific origins allowlisted below - a
// blanket 'strict' CSP would silently break sign-in or maps. This has not
// been verified against a live browser session (this environment can't
// complete calls to Firebase Auth), so treat it as a strong baseline to
// confirm against real traffic, not a guarantee.
// App Check's ReCaptchaV3Provider (src/lib/firebase-config.ts) needs
// google.com/gstatic.com for its script + verification calls, and renders
// an invisible challenge in a google.com iframe - all three added below so
// enabling a real reCAPTCHA site key doesn't get silently blocked by CSP.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://picsum.photos https://placehold.co https://storage.googleapis.com https://*.tile.openstreetmap.org https://lh3.googleusercontent.com https://*.googleusercontent.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firebaseappcheck.googleapis.com wss://*.firebaseio.com https://*.firebaseio.com https://*.tile.openstreetmap.org`,
  `frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com`,
  `media-src 'self' blob: data: https://storage.googleapis.com`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`,
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
