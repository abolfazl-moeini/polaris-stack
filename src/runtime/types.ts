/**
 * Polaris Stack Frontend Runtime Types (Plan 7, ADR D8).
 */

export interface WpDevPluginConfig {
  /**
   * Base REST endpoint for the plugin (e.g. '/wpdev-sample/v1').
   */
  endpoint?: string;

  /**
   * Custom REST nonce refresh endpoint (defaults to '/wpdev/v1/rest-nonce').
   */
  nonceEndpoint?: string;

  /**
   * Active locale string (e.g. 'fa_IR', 'en_US').
   */
  locale?: string;

  /**
   * Additional plugin-specific configuration.
   */
  [key: string]: unknown;
}

declare global {
  interface Window {
    /**
     * Standard WordPress developer namespace for plugin client configuration.
     * Enqueued via wp_add_inline_script with Object.assign to avoid legacy wp_localize_script stringification.
     */
    wpdev?: Record<string, WpDevPluginConfig>;

    /**
     * WordPress Core JavaScript APIs.
     */
    wp?: {
      apiFetch?: any;
      i18n?: any;
      url?: any;
      hooks?: any;
      domReady?: any;
      a11y?: any;
      [key: string]: any;
    };
  }
}

export interface ApiFetchOptions {
  path?: string;
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | string;
  data?: unknown;
  body?: unknown;
  headers?: Record<string, string> | Headers | [string, string][];
  parse?: boolean;
  pluginName?: string;
  [key: string]: unknown;
}

export type PublicFetchOptions = Omit<ApiFetchOptions, "pluginName"> & {
  /**
   * Optional plugin name for resolving base REST routes.
   */
  pluginName?: string;
};

export type AuthFetchOptions = ApiFetchOptions & {
  /**
   * Plugin name identifying the client data namespace in window.wpdev[pluginName].
   */
  pluginName?: string;

  /**
   * Explicit nonce endpoint override for this request.
   */
  nonceEndpoint?: string;

  /**
   * Internal retry guard: true if this request is already a single retry attempt.
   */
  _isRetry?: boolean;
};

export interface RestErrorPayload {
  code?: string;
  message?: string;
  data?: {
    status?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
