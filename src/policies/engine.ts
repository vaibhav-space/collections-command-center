import { PolicyConfig, DEFAULT_POLICY_CONFIG, PolicyDecision } from './types';

export class PolicyEngine {
  private config: PolicyConfig;
  private optOutSet: Set<string>;
  public readonly version = 'v2026.11-us-standard';

  constructor(customConfig?: Partial<PolicyConfig>) {
    this.config = {
      ...DEFAULT_POLICY_CONFIG,
      ...customConfig,
      quietHours: {
        ...DEFAULT_POLICY_CONFIG.quietHours,
        ...(customConfig?.quietHours ?? {}),
      },
    };
    this.optOutSet = new Set(this.config.optOutKeywords.map((k) => k.toUpperCase()));
  }

  /**
   * Rule 3: Mandatory STOP Opt-Out Evaluation
   */
  public isOptOut(message: string): boolean {
    const normalized = message.trim().replace(/[.!?,]+$/, '').toUpperCase();
    return this.optOutSet.has(normalized);
  }

  /**
   * Rule 5: Permissible Contact Hours (TCPA / FDCPA §805)
   * 8:00 AM – 9:00 PM in borrower's local IANA timezone.
   */
  public evaluateQuietHours(params: {
    receivedAt: string | Date;
    timezone: string;
  }): PolicyDecision {
    try {
      const date = typeof params.receivedAt === 'string' ? new Date(params.receivedAt) : params.receivedAt;
      if (isNaN(date.getTime())) {
        return {
          status: 'blocked',
          action: 'hold',
          reason: 'Invalid timestamp format for quiet-hours evaluation',
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`timestamp: ${params.receivedAt}`],
        };
      }

      const safeTimezone = params.timezone || 'America/New_York';
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: safeTimezone,
        hour: 'numeric',
        hourCycle: 'h23',
      });

      const parts = formatter.formatToParts(date);
      const hourPart = parts.find((p) => p.type === 'hour');
      if (!hourPart) {
        return {
          status: 'blocked',
          action: 'hold',
          reason: 'Failed to extract hour from timezone',
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`timezone: ${safeTimezone}`],
        };
      }

      const hour = parseInt(hourPart.value, 10);
      const { startHour, endHour } = this.config.quietHours;

      if (hour < startHour || hour >= endHour) {
        return {
          status: 'blocked',
          action: 'hold',
          reason: `Local borrower time (${hour}:00) is outside permissible hours (${startHour.toString().padStart(2, '0')}:00-${endHour}:00 local time per FDCPA §805(a)(1))`,
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [
            `timezone: ${safeTimezone}`,
            `localHour: ${hour}`,
            `window: ${startHour}:00-${endHour}:00`,
          ],
          remediation: 'Hold message until 8:00 AM local borrower time.',
        };
      }

      return {
        status: 'allowed',
        action: 'send',
        reason: `Local time (${hour}:00) is within permissible 8am-9pm window`,
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [`localHour: ${hour}`],
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown timezone error';
      return {
        status: 'blocked',
        action: 'hold',
        reason: `Timezone calculation failure: ${msg}`,
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [`error: ${msg}`],
      };
    }
  }

  /**
   * Rule 6 & 7: Dispute & Contest Evaluation with Negation-Aware Guard
   */
  public evaluateDispute(params: { message: string }): PolicyDecision {
    const lower = params.message.toLowerCase();

    // Check for explicit negations e.g. "no dispute", "not disputing", "never disputed"
    if (/\b(no\s+dispute|not\s+disputing|never\s+disputed|not\s+a\s+dispute)\b/i.test(lower)) {
      return {
        status: 'allowed',
        action: 'continue',
        reason: 'Explicit negation of dispute detected; normal processing allowed.',
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: ['negation matched'],
      };
    }

    const matchedKeyword = this.config.disputeKeywords.find((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(lower);
    });

    if (matchedKeyword) {
      return {
        status: 'requires_approval',
        action: 'createDispute',
        reason: `Borrower expressed an account contest or dispute keyword ('${matchedKeyword}'). Outbound collection demand blocked; human review required.`,
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [`matchedKeyword: ${matchedKeyword}`, `message: "${params.message}"`],
        remediation: 'Create formal Dispute Case and route to supervisor review queue.',
      };
    }

    return {
      status: 'allowed',
      action: 'continue',
      reason: 'No dispute keywords detected',
      policyVersion: this.version,
      evaluatedAt: new Date().toISOString(),
      evidence: [],
    };
  }

  /**
   * Rule 13: First-Reply Amount Non-Disclosure
   * Debt amount owed must not be disclosed in first turn unless requested.
   */
  public evaluateFirstReplyDisclosure(params: {
    isFirstMessage: boolean;
    inboundMessage: string;
    draftReply: string;
  }): PolicyDecision {
    if (!params.isFirstMessage) {
      return {
        status: 'allowed',
        action: 'send',
        reason: 'Not first turn; amount disclosure permissible.',
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: ['isFirstMessage: false'],
      };
    }

    const lowerInbound = params.inboundMessage.toLowerCase();
    const isAskingForAmount = this.config.amountInquiryKeywords.some((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerInbound);
    });

    if (isAskingForAmount) {
      return {
        status: 'allowed',
        action: 'send',
        reason: 'Borrower explicitly requested debt amount; balance disclosure authorized.',
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: ['explicit amount inquiry detected'],
      };
    }

    // Check if draft contains currency amounts
    const moneyRegex = /(\$\s*\d+(?:,\d{3})*(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:usd|dollars)\b)/i;
    if (moneyRegex.test(params.draftReply)) {
      return {
        status: 'requires_approval',
        action: 'sanitizeDraft',
        reason: 'Unprompted debt amount disclosure detected in first conversation reply. Replaced with safe greeting per disclosure privacy policy.',
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [`draftReply contains amount: "${params.draftReply}"`],
        sanitizedReply: this.config.safeFirstReplyTemplate,
      };
    }

    return {
      status: 'allowed',
      action: 'send',
      reason: 'First reply does not reveal debt amounts.',
      policyVersion: this.version,
      evaluatedAt: new Date().toISOString(),
      evidence: [],
    };
  }

  /**
   * Rule 14: Cross-Customer Privacy Scanner
   * Matches full names, phones, account numbers, and unique balances.
   * Negation-aware against common standalone first names (e.g. "May", "Will").
   */
  public evaluatePrivacy(params: {
    currentBorrowerId: string;
    currentBorrowerBalance?: number | string;
    draftReply: string;
    allBorrowers: Array<{
      id: string;
      firstName: string;
      lastName: string;
      primaryPhone: string;
      currentBalance?: number | string;
    }>;
  }): PolicyDecision {
    const foreignBorrowers = params.allBorrowers.filter((b) => b.id !== params.currentBorrowerId);
    const draftLower = params.draftReply.toLowerCase();

    for (const fb of foreignBorrowers) {
      // Check full name (matching full name prevents false positives on "May", "Will", etc.)
      const fullName = `${fb.firstName} ${fb.lastName}`.trim().toLowerCase();
      if (fullName.length > 3 && draftLower.includes(fullName)) {
        return {
          status: 'blocked',
          action: 'handoff',
          reason: `Privacy leak detected: draft contains foreign borrower full name (${fb.firstName} ${fb.lastName})`,
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`foreignBorrowerId: ${fb.id}`, `leakedName: ${fullName}`],
        };
      }

      // Check phone number (clean digits 7+)
      const cleanPhone = fb.primaryPhone.replace(/[^0-9]/g, '');
      const cleanDraft = params.draftReply.replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 7 && cleanDraft.includes(cleanPhone)) {
        return {
          status: 'blocked',
          action: 'handoff',
          reason: `Privacy leak detected: draft contains foreign borrower phone number (${fb.primaryPhone})`,
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`foreignBorrowerId: ${fb.id}`, `leakedPhone: ${fb.primaryPhone}`],
        };
      }

      // Check unique non-zero balance
      if (fb.currentBalance) {
        const balNum = typeof fb.currentBalance === 'string' ? parseFloat(fb.currentBalance) : fb.currentBalance;
        if (balNum > 0) {
          const currentBalNum = params.currentBorrowerBalance !== undefined
            ? (typeof params.currentBorrowerBalance === 'string' ? parseFloat(params.currentBorrowerBalance) : params.currentBorrowerBalance)
            : null;
          if (currentBalNum !== null && Math.abs(balNum - currentBalNum) < 0.001) {
            // Same balance as current borrower; not a foreign-only leak
            continue;
          }

          const balFormatted = balNum.toFixed(2);
          if (params.draftReply.includes(`$${balFormatted}`)) {
            return {
              status: 'blocked',
              action: 'handoff',
              reason: `Privacy leak detected: draft contains foreign balance amount ($${balFormatted})`,
              policyVersion: this.version,
              evaluatedAt: new Date().toISOString(),
              evidence: [`foreignBorrowerId: ${fb.id}`, `balance: $${balFormatted}`],
            };
          }
        }
      }
    }

    return {
      status: 'allowed',
      action: 'send',
      reason: 'Privacy scan passed: no foreign borrower data detected.',
      policyVersion: this.version,
      evaluatedAt: new Date().toISOString(),
      evidence: [],
    };
  }

  /**
   * Rule 16 & 17: Financial Limits & Promise Windows
   */
  public evaluateFinancialLimits(params: {
    action: string;
    amount: number;
    currentBalance: number;
    dueDate?: string;
  }): PolicyDecision {
    if (params.amount <= 0) {
      return {
        status: 'blocked',
        action: params.action,
        reason: `Amount must be strictly positive (received: $${params.amount.toFixed(2)})`,
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [`amount: ${params.amount}`],
      };
    }

    if (params.amount > params.currentBalance) {
      return {
        status: 'blocked',
        action: params.action,
        reason: `Amount ($${params.amount.toFixed(2)}) cannot exceed verified account balance ($${params.currentBalance.toFixed(2)})`,
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [
          `proposedAmount: ${params.amount}`,
          `currentBalance: ${params.currentBalance}`,
        ],
      };
    }

    if (params.action === 'proposePromiseToPay' && params.dueDate) {
      const due = new Date(params.dueDate);
      const now = new Date();
      if (isNaN(due.getTime())) {
        return {
          status: 'blocked',
          action: params.action,
          reason: 'Invalid promise due date format',
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`dueDate: ${params.dueDate}`],
        };
      }

      // Check if due date is in the past (allowing 24h grace for today)
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (due < startOfToday) {
        return {
          status: 'blocked',
          action: params.action,
          reason: `Promise due date (${params.dueDate}) cannot be in the past`,
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`dueDate: ${params.dueDate}`, `currentDate: ${now.toISOString()}`],
        };
      }

      // Max 90 days window
      const maxDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      if (due > maxDate) {
        return {
          status: 'blocked',
          action: params.action,
          reason: `Promise due date (${params.dueDate}) exceeds maximum allowable 90-day window`,
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`dueDate: ${params.dueDate}`, `maxDate: ${maxDate.toISOString()}`],
        };
      }
    }

    return {
      status: 'allowed',
      action: params.action,
      reason: 'Financial amounts and dates adhere to account boundaries.',
      policyVersion: this.version,
      evaluatedAt: new Date().toISOString(),
      evidence: [`amount: $${params.amount.toFixed(2)}`],
    };
  }

  /**
   * Rule 19: Stale Data & Optimistic Concurrency Guard
   */
  public evaluateStaleData(params: {
    expectedUpdatedAt?: string;
    currentUpdatedAt: Date | string;
  }): PolicyDecision {
    if (!params.expectedUpdatedAt) {
      return {
        status: 'allowed',
        action: 'continue',
        reason: 'No expected timestamp provided; proceeding.',
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [],
      };
    }

    const currentStr =
      params.currentUpdatedAt instanceof Date
        ? params.currentUpdatedAt.toISOString()
        : new Date(params.currentUpdatedAt).toISOString();

    const expectedTime = new Date(params.expectedUpdatedAt).getTime();
    const currentTime = new Date(currentStr).getTime();

    // If timestamps match exactly, allow
    if (params.expectedUpdatedAt === currentStr) {
      return {
        status: 'allowed',
        action: 'continue',
        reason: 'Account state timestamp matches expected version.',
        policyVersion: this.version,
        evaluatedAt: new Date().toISOString(),
        evidence: [],
      };
    }

    // Grace window for same-session mutations (e.g. inbound fast-path dispute hold executed within 15 seconds)
    if (!isNaN(expectedTime) && !isNaN(currentTime)) {
      const diffMs = Math.abs(currentTime - expectedTime);
      if (diffMs <= 15000) {
        return {
          status: 'allowed',
          action: 'continue',
          reason: 'Account updated within active session threshold (fast-path ingestion).',
          policyVersion: this.version,
          evaluatedAt: new Date().toISOString(),
          evidence: [`Delta: ${diffMs}ms`],
        };
      }
    }

    return {
      status: 'blocked',
      action: 'refreshAccount',
      reason: 'Account data has changed since copilot proposal was generated (optimistic lock conflict). Please refresh the account context.',
      policyVersion: this.version,
      evaluatedAt: new Date().toISOString(),
      evidence: [
        `expected: ${params.expectedUpdatedAt}`,
        `current: ${currentStr}`,
      ],
      remediation: 'Reload the latest account ledger and regenerate proposal.',
    };

    return {
      status: 'allowed',
      action: 'continue',
      reason: 'Optimistic lock verified: account data is fresh.',
      policyVersion: this.version,
      evaluatedAt: new Date().toISOString(),
      evidence: [],
    };
  }
}
