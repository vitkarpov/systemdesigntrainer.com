import type { SessionResponseDtoStatus } from "@/api/hooks.gen";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from "@/components/ui/shadcn-io/ai/prompt-input";

interface InterviewInputProps {
  value: string;
  isStreaming: boolean;
  isDisabled: boolean;
  sessionStatus: SessionResponseDtoStatus;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function InterviewInput({
  value,
  isStreaming,
  isDisabled,
  sessionStatus,
  onChange,
  onSend,
}: InterviewInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStreaming && !isDisabled && value.trim()) {
      onSend();
    }
  };

  return (
    <div className="border-t p-4 bg-card">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            sessionStatus !== "in_progress"
              ? "Interview has ended"
              : "Type your response... (Shift+Enter for new line)"
          }
          disabled={isStreaming || isDisabled}
          minHeight={60}
          maxHeight={200}
        />
        <PromptInputToolbar>
          <div className="flex-1" />
          <PromptInputSubmit
            disabled={isStreaming || !value.trim() || isDisabled}
            aria-label={isStreaming ? "Streaming" : "Send"}
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
