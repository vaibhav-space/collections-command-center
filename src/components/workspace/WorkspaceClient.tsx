'use client';

import { useState } from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Send,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  MessageSquare,
  DollarSign,
  Calendar,
  AlertCircle,
  Check,
  CreditCard,
} from 'lucide-react';

interface MessageItem {
  id: string;
  senderType: 'BORROWER' | 'OPERATOR' | 'AI_AGENT' | 'SYSTEM';
  channel: 'SMS' | 'EMAIL' | 'PHONE_CALL' | 'CHATBOT';
  body: string;
  sentAt: string;
  deliveryStatus?: string;
  detectedIntent?: string | null;
}

interface WorkspaceProps {
  initialAccount: any;
  initialConversation: any;
  initialMessages: MessageItem[];
}

export function WorkspaceClient({
  initialAccount,
  initialConversation,
  initialMessages,
}: WorkspaceProps) {
  const [account, setAccount] = useState(initialAccount);
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [inboundText, setInboundText] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Copilot State
  const [copilotData, setCopilotData] = useState<any>(null);
  const [editedDraft, setEditedDraft] = useState<string>('');

  // 1. Submit Inbound Borrower Message
  const handleSendInbound = async (textToSend?: string) => {
    const text = textToSend || inboundText;
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setNotification(null);

    try {
      // Step A: Trigger Inbound Simulation API (evaluates fast-paths like STOP/Dispute)
      const inboundRes = await fetch('/api/simulations/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          channel: selectedChannel,
          message: text,
        }),
      });

      const inboundData = await inboundRes.json();

      // Add message to timeline
      const newMsg: MessageItem = {
        id: inboundData.messageId || `msg_${Date.now()}`,
        senderType: 'BORROWER',
        channel: selectedChannel,
        body: text,
        sentAt: new Date().toISOString(),
        deliveryStatus: 'DELIVERED',
        detectedIntent: inboundData.detectedIntent,
      };

      setMessages((prev) => [...prev, newMsg]);
      setInboundText('');

      // If STOP opt-out was executed
      if (inboundData.status === 'OPTED_OUT') {
        setAccount((prev: any) => ({
          ...prev,
          borrower: { ...prev.borrower, isOptedOut: true },
        }));
        setNotification({
          type: 'error',
          text: 'Borrower opted out via statutory STOP keyword. All outbound messaging locked.',
        });
        setCopilotData(null);
        setIsAnalyzing(false);
        return;
      }

      // If Dispute was triggered
      if (inboundData.detectedIntent === 'DISPUTE') {
        setAccount((prev: any) => ({
          ...prev,
          status: 'IN_DISPUTE',
          hasActiveDispute: true,
        }));
      }

      // Step B: Trigger AI Copilot Analysis
      const copilotRes = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          inboundMessage: text,
          conversationId: initialConversation?.id,
        }),
      });

      const copilotResult = await copilotRes.json();
      setCopilotData(copilotResult);
      setEditedDraft(copilotResult.draftReply || '');

      setNotification({
        type: 'info',
        text: `AI Copilot generated proposal: ${copilotResult.primaryIntent} (${copilotResult.modelUsed})`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setNotification({ type: 'error', text: msg });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Approve & Execute Recommended Action
  const handleApproveAction = async () => {
    if (!copilotData?.recommendedAction) return;
    setIsExecuting(true);
    setNotification(null);

    try {
      const actionInputs = {
        ...(copilotData.recommendedAction.requiredInputs || {}),
        reason: copilotData.recommendedAction.requiredInputs?.reason || copilotData.recommendedAction.reason || 'Escalation requested by operator',
        description: copilotData.recommendedAction.requiredInputs?.description || copilotData.recommendedAction.reason || 'Dispute escalated for review',
        details: copilotData.recommendedAction.requiredInputs?.details || copilotData.recommendedAction.reason || 'Hardship review requested',
      };

      const payload = {
        accountId: account.id,
        action: copilotData.recommendedAction.action,
        inputs: actionInputs,
        reason: copilotData.recommendedAction.reason,
        editedDraftReply: editedDraft,
        idempotencyKey: `idem_act_${account.id}_${Date.now()}`,
        expectedAccountUpdatedAt: account.updatedAt,
        conversationId: initialConversation?.id,
        channel: selectedChannel,
      };

      const res = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        let errMessage = data.error || 'Execution blocked by policy engine.';
        if (typeof errMessage === 'string' && errMessage.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(errMessage);
            if (Array.isArray(parsed) && parsed[0]?.message) {
              errMessage = `${parsed[0].path?.join('.') || 'Validation'}: ${parsed[0].message}`;
            }
          } catch {}
        }
        setNotification({ type: 'error', text: errMessage });
        return;
      }

      // Append outbound message to timeline if sent
      if (editedDraft && editedDraft.trim() !== '') {
        setMessages((prev) => [
          ...prev,
          {
            id: data.outboundMessageId || `out_${Date.now()}`,
            senderType: 'OPERATOR',
            channel: selectedChannel,
            body: editedDraft,
            sentAt: new Date().toISOString(),
            deliveryStatus: 'DELIVERED',
          },
        ]);
      }

      // Update account state
      if (data.account) {
        setAccount((prev: any) => ({
          ...prev,
          currentBalance: data.account.currentBalance,
          amountOverdue: data.account.amountOverdue,
          status: data.account.status,
          updatedAt: data.account.updatedAt,
        }));
      }

      setNotification({
        type: 'success',
        text: `Action '${copilotData.recommendedAction.action}' approved and persisted successfully.`,
      });

      setCopilotData(null);
      setEditedDraft('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      setNotification({ type: 'error', text: msg });
    } finally {
      setIsExecuting(false);
    }
  };

  // 3. Escalate to Team Lead (Creates Case in Cases & Review Queue)
  const handleEscalateToLead = async () => {
    setIsExecuting(true);
    setNotification(null);
    try {
      const res = await fetch('/api/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          action: 'createHumanHandoff',
          inputs: {
            reason:
              copilotData?.summary ||
              copilotData?.recommendedAction?.reason ||
              'Operator escalated account to Team Lead for senior review',
            priority: 'HIGH',
          },
          idempotencyKey: `idem_esc_${account.id}_${Date.now()}`,
          expectedAccountUpdatedAt: account.updatedAt,
          conversationId: initialConversation?.id,
          channel: selectedChannel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: 'error', text: data.error || 'Failed to escalate case.' });
        return;
      }

      setNotification({
        type: 'success',
        text: 'Account successfully escalated to Team Lead. Case logged in Cases & Review queue.',
      });
      setCopilotData(null);
      setEditedDraft('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Escalation failed';
      setNotification({ type: 'error', text: msg });
    } finally {
      setIsExecuting(false);
    }
  };

  // 4. Simulate Payment Settlement Shortcut
  const handleSimulatePaymentSettlement = async (amount: number) => {
    setIsExecuting(true);
    try {
      const res = await fetch('/api/simulations/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          amount,
          status: 'SETTLED',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ type: 'error', text: data.error });
        return;
      }

      setAccount((prev: any) => ({
        ...prev,
        currentBalance: data.account.currentBalance,
        amountOverdue: data.account.amountOverdue,
      }));

      // Add system message
      setMessages((prev) => [
        ...prev,
        {
          id: `pay_${Date.now()}`,
          senderType: 'SYSTEM',
          channel: selectedChannel,
          body: `Payment of $${amount.toFixed(2)} confirmed settled via ACH. Account balance updated.`,
          sentAt: new Date().toISOString(),
          deliveryStatus: 'DELIVERED',
        },
      ]);

      setNotification({
        type: 'success',
        text: `Simulated payment of $${amount.toFixed(2)} reconciled. New balance: $${data.account.currentBalance.toFixed(2)}.`,
      });
    } catch (err: unknown) {
      setNotification({ type: 'error', text: 'Payment simulation error' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between border shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}
        >
          <span>{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* 3-COLUMN DESKTOP WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ==================================================================== */}
        {/* COLUMN 1: BORROWER CONTEXT (3 Cols) */}
        {/* ==================================================================== */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Borrower Profile
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                {account.borrower.firstName} {account.borrower.lastName}
              </h2>
              <div className="font-mono text-xs text-indigo-600 font-semibold mt-0.5">
                {account.accountNumber}
              </div>
            </div>

            {/* Financial Ledger Snapshot */}
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200/60 space-y-2 text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Verified Balance:</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(account.currentBalance)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Amount Overdue:</span>
                <span className="font-bold text-rose-600">
                  {formatCurrency(account.amountOverdue)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Days Past Due:</span>
                <span className="font-semibold text-slate-700">
                  {account.daysPastDue} DPD
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Account Status:</span>
                <span className="font-semibold text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                  {account.status}
                </span>
              </div>
            </div>

            {/* Contact & Consent */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <span className="font-medium text-slate-800">{account.borrower.primaryPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-slate-800">{account.borrower.primaryEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timezone:</span>
                <span className="font-medium text-slate-800">{account.borrower.timezone}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="text-slate-400">Consent:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    account.borrower.isOptedOut
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {account.borrower.isOptedOut ? 'STOPPED / OPTED OUT' : 'OPT-IN ACTIVE'}
                </span>
              </div>
            </div>

            {/* Quick Ledger Reconciliation Simulator */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Payment Gateway Action
              </div>
              <button
                disabled={isExecuting || account.currentBalance <= 0}
                onClick={() => handleSimulatePaymentSettlement(200.0)}
                className="w-full py-1.5 px-2 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Post $200 Payment Settlement</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* COLUMN 2: CONVERSATION TIMELINE & INBOUND COMPOSER (5 Cols) */}
        {/* ==================================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-[680px]">
            {/* Timeline Header */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">Conversation Timeline</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value as any)}
                  className="text-xs py-1 px-2 border border-slate-200 rounded bg-white text-slate-700 font-medium"
                >
                  <option value="SMS">Channel: SMS</option>
                  <option value="EMAIL">Channel: Email</option>
                </select>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => {
                const isBorrower = msg.senderType === 'BORROWER';
                const isSystem = msg.senderType === 'SYSTEM';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isBorrower ? 'items-start' : isSystem ? 'items-center' : 'items-end'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                      <span className="font-semibold text-slate-600">
                        {isBorrower ? 'Borrower' : isSystem ? 'System Engine' : 'Collector (You)'}
                      </span>
                      <span>•</span>
                      <span>{formatDateTime(msg.sentAt)}</span>
                      <span>•</span>
                      <span className="uppercase text-[9px] font-bold px-1 bg-slate-100 rounded">
                        {msg.channel}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed shadow-xs ${
                        isBorrower
                          ? 'bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200/80'
                          : isSystem
                          ? 'bg-amber-50 text-amber-900 border border-amber-200 text-center font-medium'
                          : 'bg-indigo-600 text-white rounded-tr-none font-medium'
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Inbound Simulator Composer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Inbound Message Simulation</span>
                <span className="text-[9px] font-normal text-slate-400">Fast Evaluation Presets</span>
              </div>

              {/* Fast Test Presets */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSendInbound('I can pay $200 next Tuesday')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700 transition-colors"
                >
                  "I can pay $200 next Tuesday"
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInbound('Can you send me a link to pay?')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700 transition-colors"
                >
                  "Send payment link"
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInbound('STOP')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 border border-rose-200 text-[10px] font-medium text-rose-700 transition-colors"
                >
                  "STOP"
                </button>
                <button
                  type="button"
                  onClick={() => handleSendInbound('I dispute this bill, I already paid it last week')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 border border-amber-200 text-[10px] font-medium text-amber-700 transition-colors"
                >
                  "Dispute charge"
                </button>
              </div>

              {/* Custom Input Box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inboundText}
                  onChange={(e) => setInboundText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInbound()}
                  placeholder="Type simulated message or pick preset..."
                  disabled={isAnalyzing}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 placeholder:text-slate-400"
                />
                <button
                  disabled={isAnalyzing || !inboundText.trim()}
                  onClick={() => handleSendInbound()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {isAnalyzing ? (
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* COLUMN 3: AI COPILOT & POLICY GATE (4 Cols) */}
        {/* ==================================================================== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4 min-h-[680px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">AI Copilot & Policy Gate</h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Active Assessment
              </span>
            </div>

            {copilotData ? (
              <div className="flex-1 flex flex-col space-y-3.5">
                {/* 1. Intent & Entities Card */}
                <div className="p-3 rounded-md bg-slate-50 border border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase">
                      Detected Intent:
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      {copilotData.primaryIntent}
                    </span>
                  </div>

                  {copilotData.entities?.amount && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Extracted Amount:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(copilotData.entities.amount)}
                      </span>
                    </div>
                  )}

                  {copilotData.entities?.date && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Extracted Target Date:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {copilotData.entities.date}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Structured AI Summary */}
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-700 text-[11px]">Context Summary:</div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {copilotData.summary}
                  </p>
                </div>

                {/* 3. Deterministic Policy Verdict Card */}
                <div
                  className={`p-3 rounded-md border text-xs space-y-1 ${
                    copilotData.policyVerdict?.status === 'ALLOWED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : copilotData.policyVerdict?.status === 'REQUIRES_APPROVAL'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-[11px]">
                    {copilotData.policyVerdict?.status === 'ALLOWED' ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : copilotData.policyVerdict?.status === 'REQUIRES_APPROVAL' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                    )}
                    <span>Policy Verdict: {copilotData.policyVerdict?.status}</span>
                  </div>
                  <div className="text-[11px] leading-tight">
                    {copilotData.policyVerdict?.reason}
                  </div>
                </div>

                {/* 4. Recommended Next Action */}
                <div className="p-3 rounded-md bg-indigo-50/60 border border-indigo-100 text-xs space-y-1.5">
                  <div className="text-[11px] font-bold text-indigo-900 uppercase">
                    Proposed Tool Call:
                  </div>
                  <div className="font-semibold text-slate-900 text-xs">
                    {copilotData.recommendedAction?.action}()
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {copilotData.recommendedAction?.reason}
                  </div>
                </div>

                {/* 5. In-Place Editable Response Draft */}
                <div className="flex-1 flex flex-col space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Draft Reply (Editable):</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Operator approval required
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editedDraft}
                    onChange={(e) => setEditedDraft(e.target.value)}
                    className="w-full flex-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-900"
                  />
                </div>

                {/* 6. Human Action Execution Controls */}
                <div className="pt-2 space-y-2">
                  <button
                    disabled={isExecuting || copilotData.policyVerdict?.status === 'BLOCKED'}
                    onClick={handleApproveAction}
                    className="w-full py-2 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isExecuting ? (
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>Approve Draft & Execute Tool</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCopilotData(null)}
                      className="py-1.5 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                    >
                      Reject Suggestion
                    </button>
                    <button
                      disabled={isExecuting}
                      onClick={handleEscalateToLead}
                      className="py-1.5 px-2 rounded bg-amber-50 hover:bg-amber-100 disabled:opacity-50 border border-amber-200 text-amber-800 font-medium text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      {isExecuting ? <Clock className="h-3 w-3 animate-spin" /> : null}
                      <span>Escalate to Lead</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                <Sparkles className="h-8 w-8 text-slate-300" />
                <div className="text-xs font-semibold text-slate-600">Copilot Standby</div>
                <p className="text-[11px] max-w-xs text-slate-400">
                  Select an inbound message preset or type a message in the center timeline to generate real-time AI intent analysis, entity extraction, and next-action proposals.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
