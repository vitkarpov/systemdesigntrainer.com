import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "How realistic are the AI interviews?",
    answer: "Our AI is trained on real system design interviews. It follows the same phase structure, asks follow-up questions, and applies time pressure just like a real interviewer. Many users report that it feels more realistic than expensive mock interview services."
  },
  {
    question: "Do I need system design experience?",
    answer: "You should have 5-8 years of engineering experience and basic understanding of system design concepts. This tool is for practicing the interview format, not learning concepts from scratch."
  },
  {
    question: "How long does an interview take?",
    answer: "Each interview is 45-60 minutes, just like a real system design interview round. You'll progress through requirements, design, and deep-dive phases with realistic time constraints."
  },
  {
    question: "Can I review my interviews later?",
    answer: "Yes! All interviews are saved in your dashboard with full transcripts, diagrams, and feedback reports. Review them anytime to track your progress and identify patterns."
  },
  {
    question: "Do interview packs expire?",
    answer: "No! Your interview credits never expire. Use them whenever you're ready to practice. This gives you the flexibility to prepare at your own pace."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards through Stripe's secure payment processing. Your payment information is never stored on our servers."
  },
  {
    question: "Can I cancel the Pro Unlimited subscription?",
    answer: "Yes, you can cancel anytime. You'll retain access until the end of your billing period. No questions asked, no cancellation fees."
  },
  {
    question: "Is there a money-back guarantee?",
    answer: "Yes! If you're not satisfied with your first paid interview, we'll refund you within 7 days, no questions asked. We're confident you'll find value in the platform."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about the platform
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-slate-600 transition-all"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full text-left p-6 flex items-start justify-between gap-4 hover:bg-muted/50 transition-colors"
                aria-expanded={openIndex === index}
              >
                <h3 className="text-lg font-semibold text-foreground pr-4">
                  {item.question}
                </h3>
                <div className="shrink-0 mt-1">
                  {openIndex === index ? (
                    <Minus className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 pt-0">
                  <p className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
