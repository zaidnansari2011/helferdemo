interface Config {
  API_BASE_URL: string;
  WS_URL?: string;
  GOOGLE_MAPS_API_KEY: string;
}

// Helper function to determine if we're in development
const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function to get environment variable with fallback
const getEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// Development URLs - use separate backend server
const DEVELOPMENT_CONFIG: Config = {
  API_BASE_URL: 'http://localhost:4000',
  WS_URL: 'ws://localhost:4000',
  GOOGLE_MAPS_API_KEY: getEnvVar('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', ''),
};

// Production URLs - use Vercel deployment (same origin)
const PRODUCTION_CONFIG: Config = {
  API_BASE_URL: typeof window !== 'undefined' ? window.location.origin : '',
  WS_URL: typeof window !== 'undefined' ? `wss://${window.location.host}` : '',
  GOOGLE_MAPS_API_KEY: getEnvVar('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', ''),
};

// Export the appropriate config based on environment
export const config: Config = isDevelopment ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;

// Export individual constants for convenience
export const API_BASE_URL = config.API_BASE_URL;
export const WS_URL = config.WS_URL;
export const GOOGLE_MAPS_API_KEY = config.GOOGLE_MAPS_API_KEY;

// Export environment check for other uses
export const IS_DEVELOPMENT = isDevelopment; 