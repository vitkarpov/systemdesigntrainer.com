import { getFeedbackReadyEmailBody } from './email-templates.util';

describe('Email Templates', () => {
  describe('getFeedbackReadyEmailBody', () => {
    it('should generate email body with user name', () => {
      const result = getFeedbackReadyEmailBody(
        'John Doe',
        'https://example.com/feedback/123',
      );

      expect(result).toMatchInlineSnapshot(`
"Hi John Doe,

Good news! Your interview session has been analysed, and your personalised feedback is now available.

Your feedback includes:
- Performance scores across key competencies
- Detailed strengths and areas for improvement
- Actionable next steps to enhance your skills

View your feedback here:
https://example.com/feedback/123

---
This email was sent because your interview session was automatically completed.
© 2026 SystemDesignTrainer.com. All rights reserved.
"
`);
    });

    it('should generate email body with "there" as fallback', () => {
      const result = getFeedbackReadyEmailBody(
        undefined,
        'https://example.com/feedback/456',
      );

      expect(result).toContain('Hi there,');
    });
  });
});
