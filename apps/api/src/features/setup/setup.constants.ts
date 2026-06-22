export const SETUP_STATE_ID = 'singleton';

export const SETUP_ENV_ALLOWLIST = [
  'ALLOW_CORS_URL',
  'AUTH_SECRET',
  'AUTH_URL',
  'DB_TYPE',
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_DATABASE',
  'DB_SSL',
  'SETUP_COMPLETE',
] as const;

export type SetupEnvKey = (typeof SETUP_ENV_ALLOWLIST)[number];
