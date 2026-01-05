import { BadRequestException, Logger } from '@nestjs/common';
import { SessionStatus } from '../types/session.types';

export class InvalidSessionStateException extends BadRequestException {
  private readonly logger = new Logger(InvalidSessionStateException.name);

  constructor(
    sessionId: number,
    currentState: SessionStatus,
    operation: string,
    expectedStates?: SessionStatus[],
  ) {
    const expectedMsg = expectedStates
      ? ` Expected state(s): ${expectedStates.join(', ')}`
      : '';

    super({
      message: `Cannot perform operation on session in current state`,
      errorCode: 'INVALID_SESSION_STATE',
      currentState,
      operation,
    });

    this.logger.warn(
      `Invalid state transition attempt: Cannot ${operation} session ${sessionId} in state ${currentState}.${expectedMsg}`,
      {
        sessionId,
        currentState,
        operation,
        expectedStates,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
