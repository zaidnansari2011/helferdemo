interface BackendConfig {
  BASE_URL: string;
  PORT: number;
  IS_DEVELOPMENT: boolean;
  BETTER_AUTH_SECRET: string;
  MSG91_API_KEY: string;
  MSG91_TEMPLATE_ID: string;
}

// Helper function to get environment variable with fallback
const getEnvVar = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// Helper function to get environment variable as number with fallback
const getEnvNumber = (key: string, fallback: number): number => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : fallback;
};

// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

// Export configuration
export const config: BackendConfig = {
  BASE_URL: getEnvVar('BETTER_AUTH_URL', 'http://localhost:4000'),
  PORT: getEnvNumber('PORT', 4000),
  IS_DEVELOPMENT: isDevelopment,
  BETTER_AUTH_SECRET: getEnvVar('BETTER_AUTH_SECRET', 'your-secret-key-here'),
  MSG91_API_KEY: getEnvVar('MSG91_API_KEY', ''),
  MSG91_TEMPLATE_ID: getEnvVar('MSG91_TEMPLATE_ID', ''),
};

// Export individual constants for convenience
export const {
  BASE_URL,
  PORT,
  IS_DEVELOPMENT,
  BETTER_AUTH_SECRET,
  MSG91_API_KEY,
  MSG91_TEMPLATE_ID,
} = config; 