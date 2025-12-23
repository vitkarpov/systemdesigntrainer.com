# Conversation Retry API Guide

This guide explains how to implement retry functionality in the UI for failed conversation turns.

## Overview

The saga pattern implementation ensures that if an AI response fails during streaming, the conversation state is properly tracked and can be retried. The backend provides two endpoints for managing failed conversations:

1. **GET** `/api/sessions/:id/conversation/failed` - Get all failed/pending messages
2. **POST** `/api/sessions/:id/conversation/retry` - Retry a specific failed message

---

## API Endpoints

### 1. Get Failed Messages

**Endpoint:** `GET /api/sessions/:sessionId/conversation/failed`

**Description:** Retrieves all failed or pending conversation turns for a session. Use this to display a list of retryable messages in the UI.

**Response:**
```json
{
  "success": true,
  "data": {
    "failedMessages": [
      {
        "id": 123,
        "sessionId": 456,
        "role": "candidate",
        "text": "Can you explain how the load balancer works?",
        "status": "failed",
        "partialText": "The load balancer distributes...", // Partial AI response if available
        "phase": "high_level",
        "secondsElapsed": 180,
        "createdAt": "2025-12-23T20:15:30.000Z"
      }
    ],
    "pendingMessages": [
      {
        "id": 124,
        "sessionId": 456,
        "role": "candidate",
        "text": "What about caching strategies?",
        "status": "pending",
        "partialText": null,
        "phase": "high_level",
        "secondsElapsed": 185,
        "createdAt": "2025-12-23T20:15:35.000Z"
      }
    ],
    "retryableCount": 2
  }
}
```

**Field Explanations:**
- `failedMessages`: Messages where AI response generation failed
- `pendingMessages`: Messages waiting for AI response (streaming interrupted)
- `partialText`: If streaming failed mid-way, contains the partial AI response
- `retryableCount`: Total number of messages that can be retried

---

### 2. Retry Failed Message

**Endpoint:** `POST /api/sessions/:sessionId/conversation/retry`

**Description:** Retries AI response generation for a specific failed/pending message.

**Request Body:**
```json
{
  "candidateMessageId": 123
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Conversation turn retried successfully",
  "data": {
    "interviewerMessage": {
      "id": 125,
      "sessionId": 456,
      "role": "interviewer",
      "text": "The load balancer distributes incoming requests across multiple servers...",
      "phase": "high_level",
      "secondsElapsed": 190,
      "status": "completed",
      "createdAt": "2025-12-23T20:20:00.000Z"
    },
    "detectedSignals": [
      {
        "signalName": "explained_architecture_component",
        "phase": "high_level"
      }
    ],
    "detectedRedFlags": []
  }
}
```

**Error Responses:**

**404 - Message Not Found:**
```json
{
  "statusCode": 404,
  "message": "Message not found"
}
```

**400 - Already Completed:**
```json
{
  "statusCode": 400,
  "message": "Cannot retry a completed message. This message was already processed successfully."
}
```

**403 - Wrong Session:**
```json
{
  "statusCode": 403,
  "message": "Message does not belong to this session"
}
```

---

## UI Implementation Guide

### When to Show Retry UI

1. **During SSE Streaming:** If you receive an `error` event from the SSE stream:
```typescript
eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  // data.candidateMessageId is available for retry
  // data.partialResponse contains partial AI response (if any)

  // Show retry button in UI
  showRetryButton(data.candidateMessageId, data.partialResponse);
});
```

2. **On Session Load:** Poll the `/conversation/failed` endpoint to check for pending/failed messages:
```typescript
async function checkForFailedMessages(sessionId: number) {
  const response = await fetch(`/api/sessions/${sessionId}/conversation/failed`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  const { data } = await response.json();

  if (data.retryableCount > 0) {
    // Show banner: "You have 2 failed messages. Click to retry."
    showRetryBanner(data.failedMessages, data.pendingMessages);
  }
}
```

### Example: Retry Button Component

```typescript
interface RetryButtonProps {
  sessionId: number;
  candidateMessageId: number;
  onRetrySuccess: (interviewerMessage: any) => void;
}

function RetryButton({ sessionId, candidateMessageId, onRetrySuccess }: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/conversation/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ candidateMessageId })
      });

      const result = await response.json();

      if (result.success) {
        // Add the interviewer's response to the transcript
        onRetrySuccess(result.data.interviewerMessage);

        // Hide retry button
        toast.success('Conversation turn retried successfully!');
      } else {
        toast.error('Retry failed. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to retry. Please try again later.');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <button
      onClick={handleRetry}
      disabled={isRetrying}
      className="retry-button"
    >
      {isRetrying ? 'Retrying...' : 'Retry AI Response'}
    </button>
  );
}
```

### Example: Failed Messages Banner

```typescript
function FailedMessagesBanner({ sessionId }: { sessionId: number }) {
  const [failedData, setFailedData] = useState(null);

  useEffect(() => {
    async function loadFailedMessages() {
      const response = await fetch(`/api/sessions/${sessionId}/conversation/failed`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const result = await response.json();

      if (result.data.retryableCount > 0) {
        setFailedData(result.data);
      }
    }

    loadFailedMessages();
  }, [sessionId]);

  if (!failedData || failedData.retryableCount === 0) {
    return null;
  }

  return (
    <div className="banner banner-warning">
      <AlertIcon />
      <span>
        {failedData.retryableCount} message(s) failed to get AI response.
      </span>
      <button onClick={() => showRetryModal(failedData)}>
        View & Retry
      </button>
    </div>
  );
}
```

### Display Partial Response (Optional)

If a streaming failure occurred mid-way, you might want to show the partial response to the user:

```typescript
function PartialResponseCard({ message }: { message: any }) {
  if (!message.partialText) return null;

  return (
    <div className="message partial">
      <div className="message-header">
        <span className="role">Interviewer</span>
        <span className="status-badge">Incomplete</span>
      </div>
      <div className="message-text">
        {message.partialText}
        <span className="truncated-indicator">...</span>
      </div>
      <RetryButton
        sessionId={message.sessionId}
        candidateMessageId={message.id}
        onRetrySuccess={(response) => {
          // Replace partial with complete response
          updateTranscript(response);
        }}
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Automatic Retry on Page Load

When a user navigates back to a session with failed messages, automatically check and offer to retry:

```typescript
useEffect(() => {
  async function autoCheckRetry() {
    const response = await fetch(`/api/sessions/${sessionId}/conversation/failed`);
    const { data } = await response.json();

    if (data.pendingMessages.length > 0) {
      // Pending messages should be auto-retried
      for (const msg of data.pendingMessages) {
        await retryMessage(sessionId, msg.id);
      }
    }

    if (data.failedMessages.length > 0) {
      // Failed messages should be shown to user for manual retry
      showRetryDialog(data.failedMessages);
    }
  }

  autoCheckRetry();
}, [sessionId]);
```

### 2. Show Retry Count in Session List

In the dashboard where sessions are listed, show a badge indicating failed messages:

```typescript
function SessionCard({ session }: { session: Session }) {
  const { data } = useQuery(['failed-messages', session.id], () =>
    fetchFailedMessages(session.id)
  );

  return (
    <div className="session-card">
      <h3>{session.caseTitle}</h3>
      {data?.retryableCount > 0 && (
        <span className="badge badge-warning">
          {data.retryableCount} failed
        </span>
      )}
    </div>
  );
}
```

### 3. Optimistic UI Updates

When retrying, optimistically update the UI before the API call completes:

```typescript
async function optimisticRetry(candidateMessageId: number) {
  // 1. Show loading state
  setMessageStatus(candidateMessageId, 'retrying');

  try {
    // 2. Make API call
    const result = await retryConversation(sessionId, candidateMessageId);

    // 3. Update transcript with successful response
    addMessageToTranscript(result.data.interviewerMessage);
    setMessageStatus(candidateMessageId, 'completed');
  } catch (error) {
    // 4. Revert on error
    setMessageStatus(candidateMessageId, 'failed');
    showErrorToast('Retry failed. Please try again.');
  }
}
```

---

## Testing the Retry Flow

### Simulating Failures (Development Only)

To test the retry UI, you can simulate failures by:

1. Disconnecting network mid-stream
2. Setting a very low timeout in the AI service
3. Using a mock API that returns errors

### Manual Testing Checklist

- [ ] Failed message appears in transcript with retry button
- [ ] Retry button disabled during retry
- [ ] Successful retry adds interviewer response to transcript
- [ ] Failed retry shows error message
- [ ] Partial response is displayed (if available)
- [ ] Banner shows count of failed messages
- [ ] Auto-retry pending messages on page load
- [ ] Session list shows retry badge

---

## Architecture Notes

### Why Non-Streaming for Retry?

The retry endpoint uses **non-streaming** AI response generation (unlike the SSE endpoint). This is intentional:

1. **Simplicity**: Easier to handle errors without complex streaming state
2. **Reliability**: Single request/response cycle reduces failure points
3. **User Experience**: User already waited once; non-streaming is faster for retry

If streaming is required for retry, you can use the existing SSE endpoint instead of the retry endpoint.

### Message Status States

Messages have three possible statuses:

- **`completed`**: Successfully processed (default)
- **`pending`**: Candidate message waiting for AI response
- **`failed`**: AI response generation failed (can be retried)

The saga pattern ensures these states are always consistent, even during failures.

---

## Questions?

If you have questions about implementing the retry UI, please reach out or check the backend implementation in:

- `src/interview/services/conversation-saga.service.ts` (saga pattern logic)
- `src/interview/controllers/sessions.controller.ts` (retry endpoints)
- `src/db/schema/interview-sessions.schema.ts` (message status field)
