import { FeedbackNaiveService } from './feedback-naive.service';
import { SignalName, DetectedSignal } from './signal.service';
import { RedFlagName, DetectedRedFlag } from './red-flag.service';
import { FeedbackScores } from './feedback.service';

describe('FeedbackNaiveService', () => {
  let service: FeedbackNaiveService;

  beforeEach(() => {
    service = new FeedbackNaiveService();
  });

  describe('calculateScores', () => {
    it('should return base scores when no signals or red flags', () => {
      const signals: DetectedSignal[] = [];
      const redFlags: DetectedRedFlag[] = [];
      const session = { status: 'completed' };

      const scores = service.calculateScores(signals, redFlags, session);

      expect(scores.requirements).toBe(50); // BASE_SCORES.REQUIREMENTS
      expect(scores.design).toBe(50); // BASE_SCORES.DESIGN
      expect(scores.communication).toBeGreaterThanOrEqual(50); // BASE_SCORES.COMMUNICATION + MESSAGE_COUNT_MAX bonus
      expect(scores.timeManagement).toBe(80); // BASE_SCORES.TIME_MANAGEMENT + COMPLETED_SESSION bonus
      expect(scores.depth).toBe(50); // BASE_SCORES.DEPTH
      expect(scores.overall).toBeGreaterThan(0);
    });

    it('should increase requirements score with requirement signals', () => {
      const signals: DetectedSignal[] = [
        {
          id: 1,
          sessionId: 1,
          signalName: SignalName.ASKED_FUNCTIONAL_REQS,
          detectedAt: new Date(),
          secondsElapsed: 60,
          phase: 'requirements',
          triggeredByMessageId: null,
        },
        {
          id: 2,
          sessionId: 1,
          signalName: SignalName.ASKED_NON_FUNCTIONAL_REQS,
          detectedAt: new Date(),
          secondsElapsed: 120,
          phase: 'requirements',
          triggeredByMessageId: null,
        },
      ];
      const redFlags: DetectedRedFlag[] = [];
      const session = { status: 'completed' };

      const scores = service.calculateScores(signals, redFlags, session);

      expect(scores.requirements).toBeGreaterThan(50);
    });

    it('should decrease requirements score with requirement red flags', () => {
      const signals: DetectedSignal[] = [];
      const redFlags: DetectedRedFlag[] = [
        {
          id: 1,
          sessionId: 1,
          flagName: RedFlagName.SKIPPED_REQUIREMENTS,
          detectedAt: new Date(),
          secondsElapsed: 60,
          phase: 'problem',
          description: null,
        },
      ];
      const session = { status: 'completed' };

      const scores = service.calculateScores(signals, redFlags, session);

      expect(scores.requirements).toBeLessThan(50);
    });

    it('should increase design score with design signals', () => {
      const signals: DetectedSignal[] = [
        {
          id: 1,
          sessionId: 1,
          signalName: SignalName.DREW_HIGH_LEVEL_DIAGRAM,
          detectedAt: new Date(),
          secondsElapsed: 300,
          phase: 'high_level',
          triggeredByMessageId: null,
        },
        {
          id: 2,
          sessionId: 1,
          signalName: SignalName.DISCUSSED_DATA_MODEL,
          detectedAt: new Date(),
          secondsElapsed: 400,
          phase: 'high_level',
          triggeredByMessageId: null,
        },
      ];
      const redFlags: DetectedRedFlag[] = [];
      const session = { status: 'completed' };

      const scores = service.calculateScores(signals, redFlags, session);

      expect(scores.design).toBeGreaterThan(50);
    });

    it('should cap scores at 100', () => {
      // Create many signals to potentially exceed 100
      const signals: DetectedSignal[] = Object.values(SignalName).map(
        (signalName, index) => ({
          id: index,
          sessionId: 1,
          signalName,
          detectedAt: new Date(),
          secondsElapsed: index * 60,
          phase: 'high_level',
          triggeredByMessageId: null,
        }),
      );
      const redFlags: DetectedRedFlag[] = [];
      const session = { status: 'completed' };

      const scores = service.calculateScores(signals, redFlags, session);

      expect(scores.requirements).toBeLessThanOrEqual(100);
      expect(scores.design).toBeLessThanOrEqual(100);
      expect(scores.communication).toBeLessThanOrEqual(100);
      expect(scores.timeManagement).toBeLessThanOrEqual(100);
      expect(scores.depth).toBeLessThanOrEqual(100);
    });

    it('should floor scores at 0', () => {
      // Create many red flags to potentially go below 0
      const signals: DetectedSignal[] = [];
      const redFlags: DetectedRedFlag[] = Object.values(RedFlagName).map(
        (flagName, index) => ({
          id: index,
          sessionId: 1,
          flagName,
          detectedAt: new Date(),
          secondsElapsed: index * 60,
          phase: 'problem',
          description: null,
        }),
      );
      const session = { status: 'not_started' };

      const scores = service.calculateScores(signals, redFlags, session);

      expect(scores.requirements).toBeGreaterThanOrEqual(0);
      expect(scores.design).toBeGreaterThanOrEqual(0);
      expect(scores.communication).toBeGreaterThanOrEqual(0);
      expect(scores.timeManagement).toBeGreaterThanOrEqual(0);
      expect(scores.depth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateFeedbackItems', () => {
    it('should generate strength for good requirements gathering', () => {
      const signals: DetectedSignal[] = [
        {
          id: 1,
          sessionId: 1,
          signalName: SignalName.ASKED_FUNCTIONAL_REQS,
          detectedAt: new Date(),
          secondsElapsed: 60,
          phase: 'requirements',
          triggeredByMessageId: null,
        },
        {
          id: 2,
          sessionId: 1,
          signalName: SignalName.ASKED_NON_FUNCTIONAL_REQS,
          detectedAt: new Date(),
          secondsElapsed: 120,
          phase: 'requirements',
          triggeredByMessageId: null,
        },
      ];
      const redFlags: DetectedRedFlag[] = [];
      const scores: FeedbackScores = {
        overall: 75,
        requirements: 80,
        design: 70,
        communication: 75,
        timeManagement: 80,
        depth: 70,
      };

      const items = service.generateFeedbackItems(signals, redFlags, scores);

      const strengthItems = items.filter((item) => item.type === 'strength');
      expect(strengthItems.length).toBeGreaterThan(0);
      expect(
        strengthItems.some((item) =>
          item.description.includes('functional and non-functional'),
        ),
      ).toBe(true);
    });

    it('should generate weakness for skipped requirements', () => {
      const signals: DetectedSignal[] = [];
      const redFlags: DetectedRedFlag[] = [
        {
          id: 1,
          sessionId: 1,
          flagName: RedFlagName.SKIPPED_REQUIREMENTS,
          detectedAt: new Date(),
          secondsElapsed: 60,
          phase: 'problem',
          description: null,
        },
      ];
      const scores: FeedbackScores = {
        overall: 40,
        requirements: 30,
        design: 50,
        communication: 45,
        timeManagement: 40,
        depth: 40,
      };

      const items = service.generateFeedbackItems(signals, redFlags, scores);

      const weaknessItems = items.filter((item) => item.type === 'weakness');
      expect(weaknessItems.length).toBeGreaterThan(0);
      expect(
        weaknessItems.some((item) =>
          item.description.includes('gathering requirements'),
        ),
      ).toBe(true);
    });

    it('should generate suggestions for low scores', () => {
      const signals: DetectedSignal[] = [];
      const redFlags: DetectedRedFlag[] = [];
      const scores: FeedbackScores = {
        overall: 40,
        requirements: 35,
        design: 40,
        communication: 35,
        timeManagement: 50,
        depth: 40,
      };

      const items = service.generateFeedbackItems(signals, redFlags, scores);

      const suggestionItems = items.filter(
        (item) => item.type === 'suggestion',
      );
      expect(suggestionItems.length).toBeGreaterThan(0);
    });

    it('should assign correct displayOrder', () => {
      const signals: DetectedSignal[] = [
        {
          id: 1,
          sessionId: 1,
          signalName: SignalName.STRUCTURED_APPROACH,
          detectedAt: new Date(),
          secondsElapsed: 60,
          phase: 'requirements',
          triggeredByMessageId: null,
        },
      ];
      const redFlags: DetectedRedFlag[] = [
        {
          id: 1,
          sessionId: 1,
          flagName: RedFlagName.WENT_TOO_DEEP_EARLY,
          detectedAt: new Date(),
          secondsElapsed: 120,
          phase: 'problem',
          description: null,
        },
      ];
      const scores: FeedbackScores = {
        overall: 50,
        requirements: 45,
        design: 50,
        communication: 50,
        timeManagement: 50,
        depth: 50,
      };

      const items = service.generateFeedbackItems(signals, redFlags, scores);

      // Check that displayOrder is sequential starting from 0
      items.forEach((item, index) => {
        expect(item.displayOrder).toBe(index);
      });
    });
  });

  describe('generateNextSteps', () => {
    it('should recommend requirements practice for weakest requirements', () => {
      const redFlags: DetectedRedFlag[] = [
        {
          id: 1,
          sessionId: 1,
          flagName: RedFlagName.SKIPPED_REQUIREMENTS,
          detectedAt: new Date(),
          secondsElapsed: 60,
          phase: 'problem',
          description: null,
        },
      ];
      const scores: FeedbackScores = {
        overall: 50,
        requirements: 30, // Weakest
        design: 60,
        communication: 55,
        timeManagement: 50,
        depth: 55,
      };

      const nextSteps = service.generateNextSteps(redFlags, scores);

      expect(nextSteps.length).toBeGreaterThan(0);
      expect(
        nextSteps.some((step) =>
          step.description.includes('gathering requirements'),
        ),
      ).toBe(true);
    });

    it('should recommend design study for weakest design', () => {
      const redFlags: DetectedRedFlag[] = [];
      const scores: FeedbackScores = {
        overall: 50,
        requirements: 60,
        design: 30, // Weakest
        communication: 55,
        timeManagement: 50,
        depth: 55,
      };

      const nextSteps = service.generateNextSteps(redFlags, scores);

      expect(
        nextSteps.some((step) =>
          step.description.includes('system design patterns'),
        ),
      ).toBe(true);
    });

    it('should always include practice recommendation', () => {
      const redFlags: DetectedRedFlag[] = [];
      const scores: FeedbackScores = {
        overall: 80,
        requirements: 85,
        design: 80,
        communication: 80,
        timeManagement: 75,
        depth: 80,
      };

      const nextSteps = service.generateNextSteps(redFlags, scores);

      expect(
        nextSteps.some((step) =>
          step.description.includes('another practice interview'),
        ),
      ).toBe(true);
    });

    it('should assign correct displayOrder', () => {
      const redFlags: DetectedRedFlag[] = [];
      const scores: FeedbackScores = {
        overall: 50,
        requirements: 45,
        design: 50,
        communication: 50,
        timeManagement: 50,
        depth: 50,
      };

      const nextSteps = service.generateNextSteps(redFlags, scores);

      // Check that displayOrder is sequential starting from 0
      nextSteps.forEach((step, index) => {
        expect(step.displayOrder).toBe(index);
      });
    });
  });

  describe('generateSummary', () => {
    it('should return excellent message for high scores', () => {
      const scores: FeedbackScores = {
        overall: 85,
        requirements: 90,
        design: 85,
        communication: 85,
        timeManagement: 80,
        depth: 85,
      };

      const summary = service.generateSummary(scores);

      expect(summary).toContain('Excellent');
      expect(summary.toLowerCase()).toContain('well-prepared');
    });

    it('should return good message for good scores', () => {
      const scores: FeedbackScores = {
        overall: 72,
        requirements: 75,
        design: 70,
        communication: 70,
        timeManagement: 75,
        depth: 70,
      };

      const summary = service.generateSummary(scores);

      expect(summary).toContain('Good');
    });

    it('should return decent message for moderate scores', () => {
      const scores: FeedbackScores = {
        overall: 58,
        requirements: 60,
        design: 55,
        communication: 60,
        timeManagement: 55,
        depth: 60,
      };

      const summary = service.generateSummary(scores);

      expect(summary).toContain('Decent');
    });

    it('should return poor message for low scores', () => {
      const scores: FeedbackScores = {
        overall: 35,
        requirements: 30,
        design: 35,
        communication: 40,
        timeManagement: 30,
        depth: 35,
      };

      const summary = service.generateSummary(scores);

      expect(summary.toLowerCase()).toContain('gaps');
    });
  });

  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(service.formatTime(0)).toBe('00:00');
      expect(service.formatTime(30)).toBe('00:30');
      expect(service.formatTime(60)).toBe('01:00');
      expect(service.formatTime(90)).toBe('01:30');
      expect(service.formatTime(3665)).toBe('61:05');
    });
  });

  describe('getPhaseDisplayName', () => {
    it('should return human-readable phase names', () => {
      expect(service.getPhaseDisplayName('problem')).toBe(
        'Problem Understanding',
      );
      expect(service.getPhaseDisplayName('requirements')).toBe(
        'Requirements Gathering',
      );
      expect(service.getPhaseDisplayName('high_level')).toBe(
        'High-Level Design',
      );
      expect(service.getPhaseDisplayName('deep_dive')).toBe('Deep Dive');
      expect(service.getPhaseDisplayName('bottlenecks')).toBe(
        'Bottlenecks & Trade-offs',
      );
      expect(service.getPhaseDisplayName('wrap_up')).toBe('Wrap Up');
    });

    it('should return original phase for unknown phases', () => {
      expect(service.getPhaseDisplayName('unknown_phase')).toBe(
        'unknown_phase',
      );
    });
  });
});
