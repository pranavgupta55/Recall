// src/components/DeveloperModal.jsx

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { FiX } from 'react-icons/fi';

const GPT4O_INPUT_COST_PER_MILLION = 0.15;
const GPT4O_OUTPUT_COST_PER_MILLION = 0.60;

const calculateCost = (tokenInfo) => {
  if (!tokenInfo) return 0;
  const inputCost = (tokenInfo.prompt_tokens / 1_000_000) * GPT4O_INPUT_COST_PER_MILLION;
  const outputCost = (tokenInfo.completion_tokens / 1_000_000) * GPT4O_OUTPUT_COST_PER_MILLION;
  return inputCost + outputCost;
};

const DevMessageWindow = ({ title, children }) => (
  <div className="h-full flex flex-col">
    <h4 className="font-bold mb-2 text-sm flex-shrink-0 text-muted-foreground">{title}</h4>
    <div className="text-xs bg-black/30 p-3 rounded-md overflow-auto custom-scrollbar prose prose-sm prose-invert flex-grow">
      {children || <span className="italic text-muted-foreground/50">N/A</span>}
    </div>
  </div>
);

export default function DeveloperModal({ messages, onClose }) {

  // --- FIX: Correctly parse the conversation turns ---
  const { initialSystemPromptTurn, conversationTurns } = useMemo(() => {
    if (!messages || messages.length === 0) return { initialSystemPromptTurn: null, conversationTurns: [] };
    
    let firstTurn = null;
    const subsequentTurns = [];
    let turnStartIndex = 0;

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'ai') {
        const turn = {
          promptMessages: messages.slice(turnStartIndex, i),
          aiResponse: messages[i],
        };
        // Check if the initial system prompt is part of this first turn
        if (turn.promptMessages.some(m => m.role === 'system' && m.content.includes("You are RecallAI"))) {
          firstTurn = turn;
        } else {
          subsequentTurns.push(turn);
        }
        turnStartIndex = i + 1;
      }
    }
    return { initialSystemPromptTurn: firstTurn, conversationTurns: subsequentTurns };
  }, [messages]);

  const totalSessionCost = useMemo(() => {
    const allTurns = initialSystemPromptTurn ? [initialSystemPromptTurn, ...conversationTurns] : conversationTurns;
    return allTurns.reduce((acc, turn) => acc + calculateCost(turn.aiResponse.tokenInfo), 0);
  }, [initialSystemPromptTurn, conversationTurns]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 sm:p-8 z-[200]" onClick={onClose}>
      <div className="bg-card w-full h-full max-w-7xl flex flex-col p-0 rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold">Developer Output</h2>
          <div className="text-sm font-bold text-muted-foreground">Total Session Cost: <span className="text-white">${totalSessionCost.toFixed(6)}</span></div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><FiX size={20} /></button>
        </header>
        
        <div className="flex-grow p-4 md:p-6 min-h-0 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Display subsequent turns in reverse chronological order */}
          {conversationTurns.slice().reverse().map((turn, index) => {
            const turnCost = calculateCost(turn.aiResponse.tokenInfo);
            return (
              <div key={index} className="p-4 border border-white/5 rounded-lg">
                <div className="grid gap-4 md:gap-6" style={{gridTemplateColumns: '1fr 1fr 0.6fr'}}>
                  <DevMessageWindow title="Prompt Sent to AI"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{turn.promptMessages.map(m => `**[${m.role}]**\n\n${m.content}`).join('\n\n---\n\n')}</ReactMarkdown></DevMessageWindow>
                  <DevMessageWindow title="Raw AI Response"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{turn.aiResponse.content}</ReactMarkdown></DevMessageWindow>
                  <DevMessageWindow title="Token Usage"><div className="space-y-2"><p><strong>Prompt:</strong> {turn.aiResponse.tokenInfo?.prompt_tokens}</p><p><strong>Completion:</strong> {turn.aiResponse.tokenInfo?.completion_tokens}</p><p><strong>Total:</strong> {turn.aiResponse.tokenInfo?.total_tokens}</p><hr className="border-white/10 my-2" /><p><strong>Turn Cost:</strong> ${turnCost.toFixed(6)}</p></div></DevMessageWindow>
                </div>
              </div>
            );
          })}
           {/* Display the initial system prompt turn at the very bottom */}
           {initialSystemPromptTurn && (
             <div className="p-4 mt-4 border border-dashed border-white/10 rounded-lg">
              <h3 className="font-bold text-center text-muted-foreground mb-4">Initial Prompt</h3>
              <div className="grid gap-4 md:gap-6" style={{gridTemplateColumns: '1fr 1fr 0.6fr'}}>
                  <DevMessageWindow title="Prompt Sent to AI"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{initialSystemPromptTurn.promptMessages.map(m => `**[${m.role}]**\n\n${m.content}`).join('\n\n---\n\n')}</ReactMarkdown></DevMessageWindow>
                  <DevMessageWindow title="Raw AI Response"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{initialSystemPromptTurn.aiResponse.content}</ReactMarkdown></DevMessageWindow>
                  <DevMessageWindow title="Token Usage"><div className="space-y-2"><p><strong>Prompt:</strong> {initialSystemPromptTurn.aiResponse.tokenInfo?.prompt_tokens}</p><p><strong>Completion:</strong> {initialSystemPromptTurn.aiResponse.tokenInfo?.completion_tokens}</p><p><strong>Total:</strong> {initialSystemPromptTurn.aiResponse.tokenInfo?.total_tokens}</p><hr className="border-white/10 my-2" /><p><strong>Turn Cost:</strong> ${calculateCost(initialSystemPromptTurn.aiResponse.tokenInfo).toFixed(6)}</p></div></DevMessageWindow>
              </div>
            </div>
           )}
        </div>
      </div>
    </div>
  );
}