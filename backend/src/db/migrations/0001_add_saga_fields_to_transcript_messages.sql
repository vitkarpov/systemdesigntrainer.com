-- Migration: Add saga pattern fields to transcript_messages
-- Adds status and partialText columns to support conversation saga pattern

-- Add status column to track message processing state
ALTER TABLE "transcript_messages"
ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'completed';

-- Add partialText column to store partial AI responses on failure
ALTER TABLE "transcript_messages"
ADD COLUMN "partial_text" text;

-- Create index on status for querying pending/failed messages
CREATE INDEX IF NOT EXISTS "idx_transcript_messages_status"
ON "transcript_messages" ("status");

-- Create index on sessionId + status for efficient retry queries
CREATE INDEX IF NOT EXISTS "idx_transcript_messages_session_status"
ON "transcript_messages" ("session_id", "status");

COMMENT ON COLUMN "transcript_messages"."status" IS 'Message processing status for saga pattern: completed (default), pending (waiting for AI response), failed (retry needed)';
COMMENT ON COLUMN "transcript_messages"."partial_text" IS 'Stores partial AI response if streaming fails mid-way';
