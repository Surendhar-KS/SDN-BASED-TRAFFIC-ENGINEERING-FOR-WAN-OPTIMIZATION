import { AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';
import type { AssistantMessage } from './assistantTypes';

function AssistantBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`assistant-message-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="assistant-avatar-mini">
          <Sparkles size={14} />
        </div>
      )}
      <div className={`assistant-bubble ${isUser ? 'user' : 'assistant'}`}>
        {message.text}
      </div>
    </div>
  );
}

export function AssistantWindow({
  messages,
  typing,
  onClose,
  onClear,
  suggestions,
  onSuggestion,
  pendingAction,
  onConfirm,
}: {
  messages: AssistantMessage[];
  typing: boolean;
  onClose: () => void;
  onClear: () => void;
  suggestions: string[];
  onSuggestion: (suggestion: string) => void;
  pendingAction?: { id: string; tool_name: string; reason?: string } | null;
  onConfirm: (confirmed: boolean) => void;
}) {
  return (
    <div className="assistant-window">
      <div className="assistant-header">
        <div className="assistant-header-copy">
          <div className="assistant-header-name">NetPulse AI Assistant</div>
          <div className="assistant-header-subtitle">Powered by Gemini AI</div>
        </div>
        <div className="assistant-header-actions">
          <span className="assistant-online-status"><i /> Online</span>
          <button className="assistant-close" onClick={onClose} type="button" aria-label="Close assistant">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="assistant-toolbar">
        <button className="assistant-clear" onClick={onClear} type="button">Clear conversation</button>
      </div>

      <div className="assistant-body">
        {messages.map((message) => (
          <AssistantBubble key={message.id} message={message} />
        ))}

        {typing && (
          <div className="assistant-message-row assistant">
            <div className="assistant-avatar-mini">
              <Sparkles size={14} />
            </div>
            <div className="assistant-bubble assistant typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {pendingAction && (
          <div className="assistant-confirm-box">
            <AlertTriangle size={14} />
            <div>
              <b>Confirm live route change</b>
              <p>{pendingAction.tool_name.replace(/_/g, ' ')}</p>
            </div>
            <div className="assistant-confirm-actions">
              <button type="button" className="assistant-confirm positive" onClick={() => onConfirm(true)}>
                <CheckCircle2 size={14} /> Yes
              </button>
              <button type="button" className="assistant-confirm neutral" onClick={() => onConfirm(false)}>
                <X size={14} /> No
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="assistant-suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" className="assistant-suggestion" onClick={() => onSuggestion(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
