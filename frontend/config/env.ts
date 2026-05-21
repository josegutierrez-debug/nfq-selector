/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Frontend Environment Configuration System
 * 
 * Defines highly-isolated, type-safe getters for the application environment,
 * preventing hardcoded localhost fallback when running in cloud production environments.
 */

// Dynamically compute WebSocket URL based on variables and active protocols
const getWsUrl = (): string => {
  // Check if a dedicated environment variable has been defined (e.g. from Vite bundler)
  const metaEnv = (import.meta as any).env || {};
  const envWsUrl = metaEnv.VITE_WS_URL;
  if (envWsUrl) {
    return envWsUrl;
  }

  // Fallback to location-based resolution
  if (typeof window !== "undefined" && window.location) {
    const isHttps = window.location.protocol === "https:";
    const protocol = isHttps ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  // Return local environment standard if accessed outside browser environment
  return "ws://localhost:3000";
};

// Dynamically compute App API / Base HTTP URL
const getAppUrl = (): string => {
  const metaEnv = (import.meta as any).env || {};
  const envAppUrl = metaEnv.VITE_APP_URL || metaEnv.APP_URL;
  if (envAppUrl) {
    return envAppUrl;
  }

  if (typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  return "http://localhost:3000";
};

export const env = {
  WS_URL: getWsUrl(),
  APP_URL: getAppUrl(),
  IS_PRODUCTION: ((import.meta as any).env || {}).PROD || process.env.NODE_ENV === "production"
};

export default env;
