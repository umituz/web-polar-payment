/**
 * Navigation strategy — abstracts the redirect mechanism.
 *
 * Lets the provider navigate to the checkout URL without depending on
 * `window.location` directly. In tests / SSR / React Native we can swap
 * the implementation.
 */

export interface NavigationStrategy {
  redirect(url: string): void;
}

/**
 * Default browser implementation. Uses `window.location.href` to perform a
 * full-page redirect so the Polar-hosted checkout page can manage the
 * session and return to the configured `success_url`.
 */
export class WindowNavigationStrategy implements NavigationStrategy {
  redirect(url: string): void {
    window.location.href = url;
  }
}

/**
 * Returns `null` instead of navigating. Useful in unit tests and in flows
 * that need to inspect the URL before redirecting.
 */
export class NoopNavigationStrategy implements NavigationStrategy {
  redirect(_url: string): void {
    /* intentionally no-op */
  }
}
