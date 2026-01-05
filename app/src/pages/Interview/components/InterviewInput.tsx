import type { SessionResponseDtoStatus } from '@/api/hooks.gen';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface InterviewInputProps {
  value: string;
  isStreaming: boolean;
  isDisabled: boolean;
  sessionStatus: SessionResponseDtoStatus;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function InterviewInput({
  value,
  isStreaming,
  isDisabled,
  sessionStatus,
  onChange,
  onSend,
  onKeyDown,
}: InterviewInputProps) {
  return (
    <div className="border-t px-6 py-4 bg-card">
      {sessionStatus !== 'in_progress' && (
        <div className="mb-2 text-sm text-muted-foreground">
          This interview has ended. You can review the transcript but cannot send new messages.
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            sessionStatus !== 'in_progress'
              ? 'Interview has ended'
              : 'Type your response... (Shift+Enter for new line)'
          }
          className="min-h-[60px] resize-none"
          disabled={isStreaming || isDisabled}
        />
        <Button
          onClick={onSend}
          disabled={isStreaming || !value.trim() || isDisabled}
          className="self-end"
        >
          {isStreaming ? 'Streaming...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
