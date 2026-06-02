/**
 * Builds the farewell email shown to every registered user when the
 * System Design Trainer service is retired.
 */
export const FAREWELL_EMAIL_SUBJECT =
  'Thank you for using System Design Trainer';

export function getFarewellEmailBody(userName: string | null | undefined): string {
  return `Hi ${userName ?? 'there'},

After much thought, I've decided to retire System Design Trainer.

I'm Viktor Karpov, the solo founder and developer behind it. I built and ran the whole thing on my own, and I no longer have the time to invest in it the way it deserves. Rather than let it quietly degrade, I'd rather wind it down honestly and thank you for being part of the journey. Whether you ran a single practice interview or dozens, your time and trust meant a great deal to me.

The hosted app and sign-in are now disabled, and you won't be charged again.

The good news: System Design Trainer is now open source under the MIT license:

  https://github.com/vitkarpov/systemdesigntrainer.com

That means the project doesn't have to disappear. Anyone can clone the repository, spin up a local instance, plug in their own Anthropic API key, and use it however they like — including standing up their own clone and even selling it as their own product. It's yours to build on.

Thank you, truly, for using System Design Trainer.

— Viktor Karpov
Solo founder & developer, System Design Trainer

---
© ${new Date().getFullYear()} SystemDesignTrainer.com. Open source under the MIT license.
`;
}
