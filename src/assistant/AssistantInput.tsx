import { SendHorizonal, Sparkles } from 'lucide-react';
import type { KeyboardEvent } from 'react';

export function AssistantInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="assistant-input-wrap">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask NetPulse AI..."
        rows={1}
        disabled={disabled}
      />
      <button className="assistant-send" onClick={onSubmit} type="button" disabled={disabled || !value.trim()}>
        {disabled ? <Sparkles size={16} /> : <SendHorizonal size={16} />}
      </button>
    </div>
  );
}
