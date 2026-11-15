import { generateObject } from 'ai';
import { getLanguageModel } from './client';
import { CopilotAnalysisOutputSchema, CopilotAnalysisOutput } from './schemas';
import { generateDeterministicFallback } from './fallback';
import { PolicyEngine } from '@/policies/engine';

export interface AccountSnapshotForAI {
  accountNumber: string;
  currentBalance: number;
  amountOverdue: number;
  daysPastDue: number;
  activePromise?: { amount: number; dueDate: string } | null;
  timezone: string;
}

export interface AnalyzeBorrowerMessageParams {
  accountSnapshot: AccountSnapshotForAI;
  recentMessages?: Array<{ senderType: string; channel: string; body: string }>;
  inboundMessage: string;
  referenceTime?: Date;
  policyEngine?: PolicyEngine;
}

export async function analyzeBorrowerMessage(
  params: AnalyzeBorrowerMessageParams
): Promise<CopilotAnalysisOutput> {
  const model = getLanguageModel();
  const policy = params.policyEngine ?? new PolicyEngine();
  const refDate = params.referenceTime ?? new Date();

  // Local borrower time calculation
  const safeTimezone = params.accountSnapshot.timezone || 'America/New_York';
  let formattedLocalTime = refDate.toISOString();
  try {
    formattedLocalTime = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTimezone,
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(refDate);
  } catch {
    // fallback to ISO string
  }

  // If no live model configured, execute deterministic fallback immediately
  if (!model) {
    const fallbackOutput = generateDeterministicFallback({
      inboundMessage: params.inboundMessage,
      accountSnapshot: params.accountSnapshot,
      errorReason: 'No Google Gemini API key configured',
    });

    // Run first-reply disclosure check
    const isFirst = (!params.recentMessages || params.recentMessages.length <= 1);
    const sanitizedCheck = policy.evaluateFirstReplyDisclosure({
      isFirstMessage: isFirst,
      inboundMessage: params.inboundMessage,
      draftReply: fallbackOutput.draftReply,
    });

    if (sanitizedCheck.sanitizedReply) {
      fallbackOutput.draftReply = sanitizedCheck.sanitizedReply;
    }

    return fallbackOutput;
  }

  const systemPrompt = `You are an expert, empathetic collections copilot assisting a loan servicing specialist.
Your role is to interpret borrower intent, extract entities, summarize status, and draft a respectful reply.
CRITICAL RULES:
1. Ground all numbers in verified account facts. Never invent or hallucinate balances.
2. Resolve relative dates (e.g. "next Tuesday", "tomorrow", "Friday") strictly relative to the provided Reference Date & Time in the borrower's timezone. Output normalized ISO dates (YYYY-MM-DD).
3. If the borrower is distressed or experiencing hardship, acknowledge their situation empathetically without forgiving debt.
4. If the borrower raises a dispute, double-billing claim, or fraud allegation, recommend 'createDispute' and human review.
5. In the first reply of a conversation, do not disclose specific debt balances unless the borrower explicitly inquired about their balance.`;

  const userPrompt = `
Reference Date & Time (Borrower Local): ${formattedLocalTime} (${safeTimezone})
Account Context:
- Account Number: ${params.accountSnapshot.accountNumber}
- Verified Balance: $${params.accountSnapshot.currentBalance.toFixed(2)}
- Amount Overdue: $${params.accountSnapshot.amountOverdue.toFixed(2)} (${params.accountSnapshot.daysPastDue} Days Past Due)
- Active Promise: ${
    params.accountSnapshot.activePromise
      ? `$${params.accountSnapshot.activePromise.amount.toFixed(2)} due ${params.accountSnapshot.activePromise.dueDate}`
      : 'None'
  }
- Borrower Timezone: ${safeTimezone}

Recent Conversation History:
${
  params.recentMessages && params.recentMessages.length > 0
    ? params.recentMessages.map((m) => `[${m.channel}] ${m.senderType}: ${m.body}`).join('\n')
    : '(No prior messages)'
}

New Inbound Borrower Message:
"${params.inboundMessage}"
`;

  try {
    const result = await generateObject({
      model,
      schema: CopilotAnalysisOutputSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
    });

    const output = result.object;
    output.isFallback = false;
    output.modelUsed = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    // In-code policy guardrail: first-reply debt disclosure
    const isFirst = (!params.recentMessages || params.recentMessages.length <= 1);
    const sanitizedCheck = policy.evaluateFirstReplyDisclosure({
      isFirstMessage: isFirst,
      inboundMessage: params.inboundMessage,
      draftReply: output.draftReply,
    });

    if (sanitizedCheck.sanitizedReply) {
      output.draftReply = sanitizedCheck.sanitizedReply;
    }

    return output;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown AI error';
    return generateDeterministicFallback({
      inboundMessage: params.inboundMessage,
      accountSnapshot: params.accountSnapshot,
      errorReason: errorMsg,
    });
  }
}
