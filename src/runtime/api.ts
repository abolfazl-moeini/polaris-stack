/**
 * Unified REST client with lazy nonce management and single-retry guarantee (Plan 7, ADR D8).
 *
 * Enforces:
 * - publicFetch: No X-WP-Nonce sent, preserving CDN/Varnish cacheability for public read requests.
 * - authFetch: Lazy nonce retrieval from /wpdev/v1/rest-nonce, automatic single-retry on rest_cookie_invalid_nonce.
 * - Single-source truth via window.wpdev[pluginName] namespace.
 * - Zero raw fetch/axios/jQuery.ajax usage.
 */

import apiFetch from "@wordpress/api-fetch";
import type {
  PublicFetchOptions,
  AuthFetchOptions,
  RestErrorPayload,
} from "./types";

const DEFAULT_NONCE_ENDPOINT = "/wpdev/v1/rest-nonce";

let cachedNonce: string | null = null;
let nonceInFlight: Promise<string> | null = null;
let publicMiddlewareInstalled = false;

/**
 * Ensures public requests never send an X-WP-Nonce header even if WordPress
 * core's default apiFetch middleware added one.
 */
function ensurePublicMiddleware(): void {
  if (publicMiddlewareInstalled) {
    return;
  }

  if (typeof apiFetch?.use === "function") {
    apiFetch.use((options: any, next: (opt: any) => Promise<any>) => {
      if (options?.isPublicRequest === true) {
        if (options.headers && typeof options.headers === "object") {
          for (const key of Object.keys(options.headers)) {
            if (key.toLowerCase() === "x-wp-nonce") {
              delete options.headers[key];
            }
          }
        }
      }
      return next(options);
    });
    publicMiddlewareInstalled = true;
  }
}

/**
 * Remove any variation of X-WP-Nonce from a headers collection.
 */
function stripNonceHeaders(
  headers?: Record<string, string> | Headers | [string, string][]
): Record<string, string> {
  const result: Record<string, string> = {};

  if (!headers) {
    return result;
  }

  if (headers instanceof Headers) {
    headers.forEach((val, key) => {
      if (key.toLowerCase() !== "x-wp-nonce") {
        result[key] = val;
      }
    });
    return result;
  }

  if (Array.isArray(headers)) {
    for (const [key, val] of headers) {
      if (key.toLowerCase() !== "x-wp-nonce") {
        result[key] = val;
      }
    }
    return result;
  }

  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() !== "x-wp-nonce") {
      result[key] = String(val);
    }
  }

  return result;
}

/**
 * Resolve the nonce endpoint from the standard client namespace or fallback default.
 */
export function getNonceEndpoint(pluginName?: string): string {
  if (typeof window !== "undefined" && window.wpdev) {
    if (pluginName && window.wpdev[pluginName]?.nonceEndpoint) {
      return String(window.wpdev[pluginName].nonceEndpoint);
    }
    if (window.wpdev.default?.nonceEndpoint) {
      return String(window.wpdev.default.nonceEndpoint);
    }
  }
  return DEFAULT_NONCE_ENDPOINT;
}

/**
 * Resolve the base REST route for a plugin from window.wpdev[pluginName].endpoint.
 */
export function getPluginEndpoint(pluginName?: string): string | undefined {
  if (typeof window !== "undefined" && window.wpdev && pluginName) {
    return window.wpdev[pluginName]?.endpoint;
  }
  return undefined;
}

/**
 * Retrieve the active cached nonce.
 */
export function getCachedNonce(): string | null {
  return cachedNonce;
}

/**
 * Explicitly set or seed the cached nonce (useful in unit tests or initial SSR bootstrapping).
 */
export function setCachedNonce(nonce: string | null): void {
  cachedNonce = nonce;
}

/**
 * Reset the cached nonce and in-flight request lock.
 */
export function resetNonceCache(): void {
  cachedNonce = null;
  nonceInFlight = null;
}

/**
 * Lazily fetch a fresh REST nonce from the configured endpoint.
 * Coalesces concurrent in-flight requests to prevent thundering herd.
 */
async function acquireNonce(
  pluginName?: string,
  nonceEndpointOverride?: string,
  forceRefresh = false
): Promise<string> {
  if (!forceRefresh && cachedNonce) {
    return cachedNonce;
  }

  if (nonceInFlight && !forceRefresh) {
    return nonceInFlight;
  }

  const endpoint = nonceEndpointOverride || getNonceEndpoint(pluginName);

  let fetchPromise: Promise<string> | null = null;
  fetchPromise = (async () => {
    try {
      const response = await apiFetch<any>({
        path: endpoint,
        method: "GET",
        isPublicRequest: true,
        headers: {
          "Cache-Control": "no-cache",
        },
      } as any);

      const nonce =
        typeof response === "string"
          ? response
          : response?.nonce || response?.data?.nonce;

      if (!nonce || typeof nonce !== "string") {
        throw new Error(
          `[runtime/api] Failed to retrieve valid REST nonce from "${endpoint}". Response: ${JSON.stringify(
            response
          )}`
        );
      }

      cachedNonce = nonce;
      return nonce;
    } finally {
      if (nonceInFlight === fetchPromise) {
        nonceInFlight = null;
      }
    }
  })();

  nonceInFlight = fetchPromise;
  return fetchPromise;
}

/**
 * Detect whether an error corresponds to an expired or invalid REST cookie nonce.
 */
function isInvalidNonceError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const payload = error as RestErrorPayload;
  if (payload.code === "rest_cookie_invalid_nonce") {
    return true;
  }

  if (
    payload.data?.status === 403 &&
    (payload.code === "rest_cookie_invalid_nonce" ||
      (typeof payload.message === "string" &&
        payload.message.toLowerCase().includes("cookie check failed")))
  ) {
    return true;
  }

  return false;
}

/**
 * Public REST Fetch: Strips X-WP-Nonce to guarantee CDN/Varnish cacheability.
 *
 * Use for all unauthenticated, publicly readable endpoints (e.g. catalog lists, public posts).
 */
export async function publicFetch<T = any>(
  options: PublicFetchOptions
): Promise<T> {
  ensurePublicMiddleware();

  const cleanHeaders = stripNonceHeaders(options.headers as any);

  const cleanOptions: any = {
    ...options,
    headers: cleanHeaders,
    isPublicRequest: true,
  };

  return apiFetch<T>(cleanOptions);
}

/**
 * Authenticated REST Fetch: Injects lazy nonce and provides single-retry guarantee on rest_cookie_invalid_nonce.
 *
 * Use for user-authenticated mutations, protected routes, and private resources.
 */
export async function authFetch<T = any>(
  options: AuthFetchOptions
): Promise<T> {
  const nonce = await acquireNonce(
    options.pluginName,
    options.nonceEndpoint,
    false
  );

  const requestHeaders = stripNonceHeaders(options.headers as any);
  requestHeaders["X-WP-Nonce"] = nonce;

  const requestOptions: any = {
    ...options,
    headers: requestHeaders,
    isPublicRequest: false,
  };

  try {
    return await apiFetch<T>(requestOptions);
  } catch (error) {
    // Single-Retry Guarantee: if nonce was expired, refresh once and retry
    if (isInvalidNonceError(error) && !options._isRetry) {
      // 1. Invalidate cached nonce
      cachedNonce = null;

      // 2. Fetch fresh nonce with forceRefresh = true
      const freshNonce = await acquireNonce(
        options.pluginName,
        options.nonceEndpoint,
        true
      );

      // 3. Re-execute request exactly once with new nonce
      const retryHeaders = stripNonceHeaders(options.headers as any);
      retryHeaders["X-WP-Nonce"] = freshNonce;

      const retryOptions: AuthFetchOptions = {
        ...options,
        headers: retryHeaders,
        _isRetry: true,
      };

      return await apiFetch<T>(retryOptions as any);
    }

    // Rethrow any non-nonce or repeated failure
    throw error;
  }
}
