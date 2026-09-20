/**
 * Self-Hosted GeoIP Resolver & Geo-Blocking Engine
 * Seamlessly resolves client country in both Edge and Node.js runtimes without cloud dependencies.
 */

export interface GeoBlockConfig {
  mode: 'disabled' | 'whitelist' | 'blacklist';
  allowedCountries: string[]; // e.g. ['VN']
  blockedCountries: string[]; // e.g. ['CN', 'RU']
  ipWhitelist: string[];      // Bypass all checks
  ipBlacklist: string[];      // Direct ban
  customBlockedMessage?: string;
}

export interface GeoCheckResult {
  isAllowed: boolean;
  reason?: string;
  country: string;
  ip: string;
}

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

export const COMMON_COUNTRIES: CountryInfo[] = [
  { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
  { code: 'US', name: 'Hoa Kỳ (United States)', flag: '🇺🇸' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'JP', name: 'Nhật Bản (Japan)', flag: '🇯🇵' },
  { code: 'KR', name: 'Hàn Quốc (South Korea)', flag: '🇰🇷' },
  { code: 'CN', name: 'Trung Quốc (China)', flag: '🇨🇳' },
  { code: 'RU', name: 'Nga (Russia)', flag: '🇷🇺' },
  { code: 'GB', name: 'Vương Quốc Anh (United Kingdom)', flag: '🇬🇧' },
  { code: 'DE', name: 'Đức (Germany)', flag: '🇩🇪' },
  { code: 'FR', name: 'Pháp (France)', flag: '🇫🇷' },
  { code: 'AU', name: 'Úc (Australia)', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'IN', name: 'Ấn Độ (India)', flag: '🇮🇳' },
  { code: 'TH', name: 'Thái Lan (Thailand)', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'TW', name: 'Đài Loan (Taiwan)', flag: '🇹🇼' },
  { code: 'HK', name: 'Hồng Kông (Hong Kong)', flag: '🇭🇰' },
];

// Global in-memory configuration cache for Edge & API access
let activeGeoBlockConfig: GeoBlockConfig = {
  mode: 'disabled',
  allowedCountries: ['VN'],
  blockedCountries: [],
  ipWhitelist: ['127.0.0.1', '::1'],
  ipBlacklist: [],
  customBlockedMessage: 'Truy cập bị từ chối do chính sách giới hạn địa lý của nhà trường.',
};

export class GeoIpResolver {
  /**
   * Returns current active Geo-Blocking configuration
   */
  public static getConfig(): GeoBlockConfig {
    return { ...activeGeoBlockConfig };
  }

  /**
   * Updates the active Geo-Blocking configuration
   */
  public static updateConfig(newConfig: Partial<GeoBlockConfig>): GeoBlockConfig {
    activeGeoBlockConfig = {
      ...activeGeoBlockConfig,
      ...newConfig,
      allowedCountries: (newConfig.allowedCountries || activeGeoBlockConfig.allowedCountries).map((c) => c.toUpperCase()),
      blockedCountries: (newConfig.blockedCountries || activeGeoBlockConfig.blockedCountries).map((c) => c.toUpperCase()),
    };
    return activeGeoBlockConfig;
  }

  /**
   * Resolves country code from IP address or client headers.
   */
  public static resolve(ip: string, headerCountry?: string | null): string {
    if (headerCountry && headerCountry !== 'UNKNOWN') {
      return headerCountry.toUpperCase();
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
          return geo.country.toUpperCase();
        }
      } catch {
        // Fallback if geoip data files not available in current environment
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Evaluates if a request from a specific IP and Country should be allowed or blocked.
   */
  public static evaluateAccess(
    ip: string,
    country: string,
    configOverride?: GeoBlockConfig
  ): GeoCheckResult {
    const config = configOverride || activeGeoBlockConfig;

    // 1. Check IP Blacklist first
    if (config.ipBlacklist.includes(ip)) {
      return {
        isAllowed: false,
        reason: `IP [${ip}] nằm trong danh sách IP bị cấm (Blacklist).`,
        country,
        ip,
      };
    }

    // 2. Check IP Whitelist (bypasses geo check)
    if (config.ipWhitelist.includes(ip) || country === 'LOCAL') {
      return {
        isAllowed: true,
        country,
        ip,
      };
    }

    // 3. If Geo-blocking mode is disabled, allow
    if (config.mode === 'disabled') {
      return {
        isAllowed: true,
        country,
        ip,
      };
    }

    const upperCountry = country.toUpperCase();

    // 4. Whitelist mode: only allow countries in allowedCountries
    if (config.mode === 'whitelist') {
      const isAllowed = config.allowedCountries.includes(upperCountry);
      return {
        isAllowed,
        reason: isAllowed
          ? undefined
          : `Quốc gia [${upperCountry}] không thuộc danh sách được phép truy cập (Whitelist: ${config.allowedCountries.join(', ')}).`,
        country: upperCountry,
        ip,
      };
    }

    // 5. Blacklist mode: block countries in blockedCountries
    if (config.mode === 'blacklist') {
      const isBlocked = config.blockedCountries.includes(upperCountry);
      return {
        isAllowed: !isBlocked,
        reason: isBlocked
          ? `Quốc gia [${upperCountry}] nằm trong danh sách hạn chế truy cập (Blacklist: ${config.blockedCountries.join(', ')}).`
          : undefined,
        country: upperCountry,
        ip,
      };
    }

    return { isAllowed: true, country, ip };
  }
}

