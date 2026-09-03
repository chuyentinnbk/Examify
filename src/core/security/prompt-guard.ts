/**
 * ============================================================================
 * Anti-Prompt Injection & Jailbreak Defense Engine (PromptGuard)
 * ============================================================================
 * Self-hosted security layer protecting AI model system prompts from:
 * 1. Direct System Override / Instruction Bypasses
 * 2. Delimiter Hijacking & Special Token Injection (<system>, [INST], ###)
 * 3. Roleplay & Persona Evasion (DAN mode, Developer Mode, sudo/root)
 * 4. Homoglyphs & Obfuscated Character Injection
 * 5. Data Exfiltration & Secondary Instruction Exploits
 */

export interface SanitizationResult {
  isValid: boolean;
  sanitizedText: string;
  riskScore: number; // 0.0 (Safe) to 1.0 (Severe threat)
  detectedThreats: ThreatCategory[];
  rejectionReason?: string;
  metadata?: {
    originalLength: number;
    sanitizedLength: number;
    matchedPatterns: string[];
  };
}

export type ThreatCategory =
  | 'SYSTEM_OVERRIDE'
  | 'DELIMITER_HIJACKING'
  | 'JAILBREAK_PERSONA'
  | 'OBFUSCATION_EVASION'
  | 'DATA_EXFILTRATION'
  | 'CODE_INJECTION';

// ------------------------------------------------------------------------------
// Threat Pattern Catalog
// ------------------------------------------------------------------------------

const SYSTEM_OVERRIDE_PATTERNS = [
  /\b(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|prior|existing|above)\s+(?:instructions|directions|prompts|rules|commands|constraints)\b/i,
  /\b(?:reset|delete|wipe)\s+(?:your\s+)?(?:memory|system\s+prompt|context|directives)\b/i,
  /\b(?:you\s+must|always)\s+(?:obey|follow)\s+(?:my\s+commands\s+only|my\s+exclusive\s+rules)\b/i,
  /\b(?:stop\s+being|no\s+longer\s+act\s+as)\s+(?:an?\s+)?(?:exam\s+generator|ai\s+assistant|tutor)\b/i,
  /\bnew\s+operating\s+instructions\s*:\b/i,
];

const DELIMITER_HIJACKING_PATTERNS = [
  /<\s*\/?\s*(?:system|assistant|human|user|instruction|prompt|context)\s*>/i,
  /\[\s*\/?\s*(?:INST|SYS|SYSTEM|USER|ASSISTANT)\s*\]/i,
  /<\|(?:im_start|im_end|endoftext|system|user|assistant)\|>/i,
  /<<\s*(?:SYS|SYSTEM)\s*>>/i,
  /^\s*#{2,6}\s*(?:system|instruction|admin|override)\s*:/im,
  /```(?:system|admin|override|prompt)/i,
];

const JAILBREAK_PERSONA_PATTERNS = [
  /\b(?:DAN|Do\s+Anything\s+Now)\s+mode\b/i,
  /\b(?:developer|dev|god|sudo|root|superuser)\s+mode\b/i,
  /\bact\s+as\s+(?:an?\s+)?(?:unfiltered|unrestricted|uncensored|evil|jailbroken)\b/i,
  /\b(?:pretend\s+you\s+have\s+no|disable\s+all\s+your)\s+(?:rules|filters|safety\s+guidelines|ethics)\b/i,
  /\boutput\s+only\s+(?:raw|unfiltered)\s+answers\s+without\s+restrictions\b/i,
];

const DATA_EXFILTRATION_PATTERNS = [
  /\b(?:print|reveal|display|output|show|leak|tell|dump|extract)\s+(?:all\s+)?(?:the\s+)?(?:your\s+)?(?:hidden\s+|secret\s+|initial\s+|underlying\s+)?(?:system\s+prompt|prompt|instructions|directives|rules|secret\s+key|api\s+key|database\s+credentials|tokens?)\b/i,
  /\bwhat\s+(?:are|were)\s+(?:all\s+)?(?:the\s+)?(?:your\s+)?(?:exact\s+|hidden\s+|initial\s+)?(?:instructions|directives|system\s+prompts?|rules)\b/i,
  /\bbase64\s+(?:encode|dump|extract|output|print)?\s*(?:your|the)?\s*(?:system\s+prompt|instructions|keys?|secrets?)\b/i,
];

const CODE_INJECTION_PATTERNS = [
  /\b(?:eval|exec|Function|system|child_process|spawn|fs\.read)\s*\(/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /javascript\s*:/i,
];

export class PromptGuard {
  private static readonly MAX_PROMPT_LENGTH = 1500;
  private static readonly REJECT_THRESHOLD = 0.5;

  /**
   * Normalizes text by stripping zero-width unicode characters,
   * unmasking common homoglyphs, and removing excessive formatting abuse.
   */
  private static normalizeText(text: string): string {
    return text
      // Remove zero-width spaces and invisible control characters
      .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '')
      // Normalize Unicode forms (NFKC transforms homoglyphs like Cyrillic lookalikes)
      .normalize('NFKC')
      // Replace excessive consecutive newlines and spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Strips malicious tag delimiters that could trick parser envelopes.
   */
  private static stripDelimiters(text: string): string {
    return text
      .replace(/<\|[\w\s|-]+\|>/gi, '[stripped-token]')
      .replace(/\[\/?(?:INST|SYS|SYSTEM)\]/gi, '[stripped-tag]')
      .replace(/<\/?(?:system|assistant|human)>/gi, '[stripped-tag]')
      .replace(/<<\/?(?:SYS|SYSTEM)>>/gi, '[stripped-tag]');
  }

  /**
   * Evaluates input prompt against threat catalog and computes risk metrics.
   */
  public static sanitize(rawPrompt: string | null | undefined): SanitizationResult {
    if (!rawPrompt || rawPrompt.trim() === '') {
      return {
        isValid: true,
        sanitizedText: '',
        riskScore: 0.0,
        detectedThreats: [],
      };
    }

    const originalLength = rawPrompt.length;

    // Check maximum payload limit
    if (originalLength > this.MAX_PROMPT_LENGTH) {
      return {
        isValid: false,
        sanitizedText: '',
        riskScore: 0.9,
        detectedThreats: ['OBFUSCATION_EVASION'],
        rejectionReason: `Custom prompt exceeds maximum allowable length of ${this.MAX_PROMPT_LENGTH} characters.`,
        metadata: {
          originalLength,
          sanitizedLength: 0,
          matchedPatterns: ['MAX_LENGTH_EXCEEDED'],
        },
      };
    }

    const normalized = this.normalizeText(rawPrompt);
    const matchedPatterns: string[] = [];
    const detectedThreats: ThreatCategory[] = [];
    let riskScore = 0.0;

    // 1. Evaluate System Override Patterns
    for (const pattern of SYSTEM_OVERRIDE_PATTERNS) {
      if (pattern.test(normalized)) {
        matchedPatterns.push(pattern.source);
        detectedThreats.push('SYSTEM_OVERRIDE');
        riskScore += 0.6;
      }
    }

    // 2. Evaluate Delimiter Hijacking Patterns
    for (const pattern of DELIMITER_HIJACKING_PATTERNS) {
      if (pattern.test(normalized) || pattern.test(rawPrompt)) {
        matchedPatterns.push(pattern.source);
        detectedThreats.push('DELIMITER_HIJACKING');
        riskScore += 0.5;
      }
    }

    // 3. Evaluate Jailbreak & Persona Evasion
    for (const pattern of JAILBREAK_PERSONA_PATTERNS) {
      if (pattern.test(normalized)) {
        matchedPatterns.push(pattern.source);
        detectedThreats.push('JAILBREAK_PERSONA');
        riskScore += 0.7;
      }
    }

    // 4. Evaluate Data Exfiltration
    for (const pattern of DATA_EXFILTRATION_PATTERNS) {
      if (pattern.test(normalized)) {
        matchedPatterns.push(pattern.source);
        detectedThreats.push('DATA_EXFILTRATION');
        riskScore += 0.8;
      }
    }

    // 5. Evaluate Code Injection
    for (const pattern of CODE_INJECTION_PATTERNS) {
      if (pattern.test(normalized)) {
        matchedPatterns.push(pattern.source);
        detectedThreats.push('CODE_INJECTION');
        riskScore += 0.9;
      }
    }

    // Cap risk score at 1.0
    riskScore = Math.min(1.0, riskScore);

    // If score exceeds rejection threshold, decline prompt
    if (riskScore >= this.REJECT_THRESHOLD) {
      const uniqueThreats = Array.from(new Set(detectedThreats));
      return {
        isValid: false,
        sanitizedText: '',
        riskScore,
        detectedThreats: uniqueThreats,
        rejectionReason: `Prompt rejected due to security policy violation (${uniqueThreats.join(', ')}).`,
        metadata: {
          originalLength,
          sanitizedLength: 0,
          matchedPatterns,
        },
      };
    }

    // For benign/low-risk inputs, apply clean tag stripping
    const sanitizedText = this.stripDelimiters(normalized);

    return {
      isValid: true,
      sanitizedText,
      riskScore,
      detectedThreats: Array.from(new Set(detectedThreats)),
      metadata: {
        originalLength,
        sanitizedLength: sanitizedText.length,
        matchedPatterns,
      },
    };
  }
}
