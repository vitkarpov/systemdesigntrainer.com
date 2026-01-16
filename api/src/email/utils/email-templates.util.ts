export function getFeedbackReadyEmailBody(
  userName: string | undefined,
  feedbackUrl: string,
): string {
  return `Hi ${userName ?? 'there'},

Good news! Your interview session has been analysed, and your personalised feedback is now available.

Your feedback includes:
- Performance scores across key competencies
- Detailed strengths and areas for improvement
- Actionable next steps to enhance your skills

View your feedback here:
${feedbackUrl}

---
This email was sent because your interview session was automatically completed.
© ${new Date().getFullYear()} SystemDesignTrainer.com. All rights reserved.
`;
}
