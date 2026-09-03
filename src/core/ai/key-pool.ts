/**
 * Multi-Key Rotation & Rate-Limit Cooldown Manager
 * Rotates multiple API keys across LLM requests with automatic cooldown when rate-limited.
 */

interface KeyStatus {
  key: string;
  cooldownUntil: number;
  failureCount: number;
}

export class KeyPoolManager {
  private keys: KeyStatus[] = [];
  private currentIndex = 0;
  private poolName: string;

  constructor(poolName: string, rawKeys: string | undefined | null) {
    this.poolName = poolName;
    if (rawKeys) {
      const parsedKeys = rawKeys
        .split(/[,;\n]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      this.keys = parsedKeys.map((key) => ({
        key,
        cooldownUntil: 0,
        failureCount: 0,
      }));
    }
  }

  /**
   * Returns the count of configured keys.
   */
  public get totalKeys(): number {
    return this.keys.length;
  }

  /**
   * Retrieves the next active, non-cooled-down API key using Round-Robin.
   */
  public getNextKey(): string | null {
    if (this.keys.length === 0) return null;

    const now = Date.now();
    const total = this.keys.length;

    // Search for the first healthy key starting from currentIndex
    for (let i = 0; i < total; i++) {
      const idx = (this.currentIndex + i) % total;
      const keyObj = this.keys[idx];

      if (keyObj.cooldownUntil <= now) {
        this.currentIndex = (idx + 1) % total;
        return keyObj.key;
      }
    }

    // If all keys are currently cooling down, return the one that expires soonest
    const sorted = [...this.keys].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
    const earliest = sorted[0];
    const waitSeconds = Math.max(1, Math.ceil((earliest.cooldownUntil - now) / 1000));

    if (process.env.DEBUG === 'true') {
      console.warn(
        `⚠️ [KeyPool:${this.poolName}] All ${total} keys are on cooldown. Earliest key resets in ${waitSeconds}s.`
      );
    }

    return earliest.key;
  }

  /**
   * Marks a specific key as rate-limited / failed with cooldown TTL.
   */
  public markRateLimited(key: string, cooldownSeconds = 60): void {
    const keyObj = this.keys.find((k) => k.key === key);
    if (keyObj) {
      keyObj.failureCount++;
      keyObj.cooldownUntil = Date.now() + cooldownSeconds * 1000;

      if (process.env.DEBUG === 'true') {
        console.warn(
          `⚠️ [KeyPool:${this.poolName}] Key (...${key.slice(-6)}) rate-limited. Cooling down for ${cooldownSeconds}s.`
        );
      }
    }
  }

  /**
   * Resets failure metrics upon a successful request.
   */
  public markSuccess(key: string): void {
    const keyObj = this.keys.find((k) => k.key === key);
    if (keyObj) {
      keyObj.failureCount = 0;
      keyObj.cooldownUntil = 0;
    }
  }
}
