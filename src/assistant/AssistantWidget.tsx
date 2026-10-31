import { Bot, MessageSquareText, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AssistantContext } from './assistantContext';
import { AssistantInput } from './AssistantInput';
import { AssistantWindow } from './AssistantWindow';
import { assistantService } from './assistantService';
import type { AssistantAction, AssistantChatResponse, AssistantMessage } from './assistantTypes';

const STORAGE_KEY = 'netpulse-ai-session-v1';
const OPEN_KEY = 'netpulse-ai-open-v1';

const defaultSuggestions = [
  'Show network status',
  'Check current traffic',
  'Find congested links',
  'Explain the active network path',
  'Show recent alerts',
  'Open network topology',
];

const buildGreeting = (): AssistantMessage[] => [{
  id: 'assistant-welcome',
  role: 'assistant',
  text: 'Hi! I’m your NetPulse assistant. I can check live network status, explain congestion, open pages, and handle demo-only actions without touching the live system.',
}];

export function AssistantWidget({
  page,
  mode,
  onNavigate,
}: {
  page: string;
  mode: 'Live' | 'Demo';
  onNavigate: (page: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(OPEN_KEY);
    return stored ? stored === 'true' : false;
  });
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    if (typeof window === 'undefined') return buildGreeting();
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return buildGreeting();

    try {
      const parsed = JSON.parse(stored) as AssistantMessage[];
      return parsed.length ? parsed : buildGreeting();
    } catch {
      return buildGreeting();
    }
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string; tool_name: string; reason?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(OPEN_KEY, String(isOpen));
    }
  }, [isOpen]);

  const contextValue = useMemo(
    () => ({ page, mode, navigate: (nextPage: string) => onNavigate(nextPage) }),
    [mode, onNavigate, page],
  );

  const addMessage = (message: AssistantMessage) => {
    setMessages((current) => [...current, message]);
  };

  const applyFrontendAction = (action: AssistantAction | null | undefined) => {
    if (!action) return;

    if (action.type === 'navigate' && action.page) {
      onNavigate(action.page);
    }

    if (action.type === 'demo_action') {
      const customEvent = new CustomEvent('netpulse-demo-command', { detail: action });
      window.dispatchEvent(customEvent);
    }
  };

  const handleSend = async (messageText?: string) => {
    const nextText = (messageText ?? input).trim();
    if (!nextText || typing) return;

    const userMessage: AssistantMessage = { id: `user-${Date.now()}`, role: 'user', text: nextText };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setTyping(true);

    try {
      const response = await assistantService.sendChat({
        message: nextText,
        page,
        mode,
        conversation: [...messages, userMessage],
      });

      if (response.frontend_action) {
        applyFrontendAction(response.frontend_action as AssistantAction);
      }

      if (response.pending_action) {
        setPendingAction(response.pending_action);
      } else {
        setPendingAction(null);
      }

      addMessage({ id: `assistant-${Date.now()}`, role: 'assistant', text: response.reply });
    } catch (error) {
      addMessage({
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'The assistant is temporarily unavailable.',
      });
    } finally {
      setTyping(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    void handleSend(suggestion);
  };

  const handleConfirmation = async (confirmed: boolean) => {
    if (!pendingAction) return;

    try {
      const response = await assistantService.confirmAction({
        action_id: pendingAction.id,
        confirmed,
      });

      if (response.frontend_action) {
        applyFrontendAction(response.frontend_action as AssistantAction);
      }

      const message = response.reply || (confirmed ? 'The route change was confirmed.' : 'The live route change was not executed.');
      addMessage({ id: `assistant-confirm-${Date.now()}`, role: 'assistant', text: message });
    } catch (error) {
      addMessage({
        id: `assistant-confirm-error-${Date.now()}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'I could not confirm the route change.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const clearConversation = () => {
    const confirmed = window.confirm('Clear the current NetPulse AI conversation?');
    if (!confirmed) return;
    setMessages(buildGreeting());
    setPendingAction(null);
    setInput('');
  };

  return (
    <AssistantContext.Provider value={contextValue}>
      <div className="assistant-widget">
        {!isOpen ? (
          <button
            className="assistant-launcher"
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open NetPulse AI assistant"
          >
            <div className="assistant-launcher-badge">
              <Bot size={22} />
              <span className="assistant-online-dot" />
            </div>
          </button>
        ) : (
          <AssistantWindow
            messages={messages}
            typing={typing}
            onClose={() => setIsOpen(false)}
            onClear={clearConversation}
            suggestions={defaultSuggestions}
            onSuggestion={handleSuggestion}
            pendingAction={pendingAction}
            onConfirm={handleConfirmation}
          />
        )}

        {isOpen && (
          <div className="assistant-input-panel">
            <AssistantInput value={input} onChange={setInput} onSubmit={() => void handleSend()} disabled={typing} />
          </div>
        )}
      </div>
    </AssistantContext.Provider>
  );
}
