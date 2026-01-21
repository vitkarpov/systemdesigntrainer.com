import { ConsoleLogger } from '@nestjs/common';
import { CustomLoggerService } from './custom-logger.service';

describe('CustomLoggerService', () => {
  let logger: CustomLoggerService;
  let superLogSpy: jest.SpyInstance;
  let superErrorSpy: jest.SpyInstance;
  let superWarnSpy: jest.SpyInstance;
  let superDebugSpy: jest.SpyInstance;

  let superVerboseSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new CustomLoggerService();
    // Spy on the parent ConsoleLogger methods
    superLogSpy = jest
      .spyOn(ConsoleLogger.prototype, 'log')
      .mockImplementation();
    superErrorSpy = jest
      .spyOn(ConsoleLogger.prototype, 'error')
      .mockImplementation();
    superWarnSpy = jest
      .spyOn(ConsoleLogger.prototype, 'warn')
      .mockImplementation();
    superDebugSpy = jest
      .spyOn(ConsoleLogger.prototype, 'debug')
      .mockImplementation();
    superVerboseSpy = jest
      .spyOn(ConsoleLogger.prototype, 'verbose')
      .mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log', () => {
    it('should format string message with string context', () => {
      logger.log('Test message', 'TestContext');
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Test message",
  "TestContext",
]
`);
    });

    it('should format string message with object context inline', () => {
      logger.log('User action', { userId: 123, action: 'login' });
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "User action {"userId":123,"action":"login"}",
]
`);
    });

    it('should format string message without context', () => {
      logger.log('Simple message');
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Simple message",
  undefined,
]
`);
    });

    it('should serialize object message to inline JSON', () => {
      logger.log({ event: 'user_login', timestamp: 1234567890 });
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "{"event":"user_login","timestamp":1234567890}",
  undefined,
]
`);
    });

    it('should handle object message with object context', () => {
      logger.log({ event: 'payment' }, { userId: 456, amount: 99.99 });
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "{"event":"payment"} {"userId":456,"amount":99.99}",
]
`);
    });

    it('should handle nested objects', () => {
      logger.log('Complex data', {
        user: { id: 1, name: 'John' },
        metadata: { source: 'api' },
      });
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Complex data {"user":{"id":1,"name":"John"},"metadata":{"source":"api"}}",
]
`);
    });
  });

  describe('error', () => {
    it('should format error message with string context', () => {
      logger.error('Error occurred', 'ErrorContext');
      expect(superErrorSpy).toHaveBeenCalledTimes(1);
      expect(superErrorSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Error occurred",
  "ErrorContext",
  undefined,
]
`);
    });

    it('should format error message with stack trace', () => {
      logger.error(
        'Database error',
        'Error: Connection failed\n  at ...',
        'DatabaseService',
      );
      expect(superErrorSpy).toHaveBeenCalledTimes(1);
      expect(superErrorSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Database error",
  "Error: Connection failed
  at ...",
  "DatabaseService",
]
`);
    });

    it('should format error message with object context inline', () => {
      logger.error('Query failed', { query: 'SELECT *', errorCode: 500 });
      expect(superErrorSpy).toHaveBeenCalledTimes(1);
      expect(superErrorSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Query failed {"query":"SELECT *","errorCode":500}",
]
`);
    });

    it('should handle Error instance as message', () => {
      const error = new Error('Something went wrong');
      logger.error(error);
      expect(superErrorSpy).toHaveBeenCalledTimes(1);
      // Error objects serialize to their util.inspect representation
      expect(superErrorSpy.mock.calls[0][0]).toBeDefined();
    });
  });

  describe('warn', () => {
    it('should format warning message with string context', () => {
      logger.warn('Deprecated API', 'ApiController');
      expect(superWarnSpy).toHaveBeenCalledTimes(1);
      expect(superWarnSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Deprecated API",
  "ApiController",
]
`);
    });

    it('should format warning message with object context', () => {
      logger.warn('Rate limit approaching', { current: 90, max: 100 });
      expect(superWarnSpy).toHaveBeenCalledTimes(1);
      expect(superWarnSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Rate limit approaching {"current":90,"max":100}",
]
`);
    });

    it('should format warning message without context', () => {
      logger.warn('Memory usage high');
      expect(superWarnSpy).toHaveBeenCalledTimes(1);
      expect(superWarnSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Memory usage high",
  undefined,
]
`);
    });
  });

  describe('debug', () => {
    it('should format debug message with string context', () => {
      logger.debug('Processing request', 'RequestHandler');
      expect(superDebugSpy).toHaveBeenCalledTimes(1);
      expect(superDebugSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Processing request",
  "RequestHandler",
]
`);
    });

    it('should format debug message with object context', () => {
      logger.debug('Cache miss', { key: 'user:123', ttl: 3600 });
      expect(superDebugSpy).toHaveBeenCalledTimes(1);
      expect(superDebugSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Cache miss {"key":"user:123","ttl":3600}",
]
`);
    });
  });

  describe('verbose', () => {
    it('should format verbose message with string context', () => {
      logger.verbose('Detailed trace', 'TraceService');
      expect(superVerboseSpy).toHaveBeenCalledTimes(1);
      expect(superVerboseSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Detailed trace",
  "TraceService",
]
`);
    });

    it('should format verbose message with object context', () => {
      logger.verbose('Request details', {
        method: 'POST',
        path: '/api/users',
        duration: 125,
      });
      expect(superVerboseSpy).toHaveBeenCalledTimes(1);
      expect(superVerboseSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Request details {"method":"POST","path":"/api/users","duration":125}",
]
`);
    });
  });

  describe('edge cases', () => {
    it('should handle circular references gracefully', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      logger.log('Circular object', obj);
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      // Should fallback to util.inspect for circular references
      expect(superLogSpy.mock.calls[0][0]).toContain('test');
    });

    it('should handle null values', () => {
      logger.log('Null value', null as any);
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Null value",
]
`);
    });

    it('should handle undefined values', () => {
      logger.log('Undefined value', undefined);
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Undefined value",
  undefined,
]
`);
    });

    it('should handle numbers', () => {
      logger.log(12345);
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "12345",
  undefined,
]
`);
    });

    it('should handle booleans', () => {
      logger.log(true);
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "true",
  undefined,
]
`);
    });

    it('should handle arrays', () => {
      logger.log('Array data', [1, 2, 3]);
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Array data [1,2,3]",
]
`);
    });

    it('should handle empty objects', () => {
      logger.log('Empty object', {});
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0]).toMatchInlineSnapshot(`
[
  "Empty object {}",
]
`);
    });

    it('should handle special characters in strings', () => {
      logger.log('Special chars: \n\t"quotes"', 'TestContext');
      expect(superLogSpy).toHaveBeenCalledTimes(1);
      expect(superLogSpy.mock.calls[0][0]).toContain('Special chars');
      expect(superLogSpy.mock.calls[0][1]).toBe('TestContext');
    });
  });
});
