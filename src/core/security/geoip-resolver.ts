/**
 * Self-Hosted GeoIP Resolver
 * Seamlessly resolves client country in both Edge and Node.js runtimes without cloud dependencies.
 */

export class GeoIpResolver {
  /**
   * Resolves country code from IP address or client headers.
   */
  public static resolve(ip: string, headerCountry?: string | null): string {
    if (headerCountry && headerCountry !== 'UNKNOWN') {
      return headerCountry;
    }

    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.')
    ) {
      return 'LOCAL';
    }

    // If running in Node.js server environment (not Edge Runtime)
    if (
      typeof process !== 'undefined' &&
      typeof (globalThis as unknown as { EdgeRuntime?: string }).EdgeRuntime === 'undefined'
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const geoip = require('geoip-lite');
        const geo = geoip.lookup(ip);
        if (geo?.country) {
          return geo.country;
        }
      } catch {
        // Fallback if geoip data files not available in current environment
      }
    }

    return 'UNKNOWN';
  }
}
