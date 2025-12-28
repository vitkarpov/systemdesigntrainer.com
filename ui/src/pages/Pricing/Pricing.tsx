import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { UserMenu } from '@/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthControllerGetUser } from '@/api/hooks.gen';
import { toast } from 'sonner';

const PRICE_IDS = {
  THREE_INTERVIEWS: 'price_1SjLXc6w90vVabvpnGzBwrTP',
  FIVE_INTERVIEWS: 'price_1SjLap6w90vVabvpL9NSujHS',
  UNLIMITED: 'price_1SjLZu6w90vVabvpHjJjaaRO',
};

interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceId: string;
  description: string;
  features: string[];
  popular?: boolean;
  pricePerInterview?: string;
}

const tiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    price: '$39',
    priceId: PRICE_IDS.THREE_INTERVIEWS,
    pricePerInterview: '$13 per interview',
    description: 'Perfect for trying out the platform',
    features: [
      '3 interview simulations',
      'AI-powered interviewer',
      'Real-time feedback',
      'Detailed performance report',
      'Credits never expire',
    ],
  },
  {
    id: 'power',
    name: 'Power Pack',
    price: '$59',
    priceId: PRICE_IDS.FIVE_INTERVIEWS,
    pricePerInterview: '$11.80 per interview',
    description: 'Best value for comprehensive prep',
    features: [
      '5 interview simulations',
      'AI-powered interviewer',
      'Real-time feedback',
      'Detailed performance report',
      'Credits never expire',
      'Best value per interview',
    ],
    popular: true,
  },
  {
    id: 'unlimited',
    name: 'Pro Unlimited',
    price: '$149',
    priceId: PRICE_IDS.UNLIMITED,
    description: 'Unlimited practice for serious prep',
    features: [
      'Unlimited interviews',
      'AI-powered interviewer',
      'Real-time feedback',
      'Detailed performance reports',
      'Cancel anytime',
      'Perfect for intensive preparation',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { data: user } = useAuthControllerGetUser();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (priceId: string, tierName: string) => {
    setLoading(priceId);

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(`Failed to start checkout for ${tierName}`);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Pricing"
        onBack={() => navigate('/')}
        backLabel="Dashboard"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Choose Your Practice Plan
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {user?.subscriptionStatus === 'unlimited' ? (
              <>You have unlimited interviews. No need to purchase more!</>
            ) : (
              <>
                You have{' '}
                <span className="font-semibold text-foreground">
                  {user?.interviewsRemaining || 0} interviews
                </span>{' '}
                remaining. Purchase more to continue practicing.
              </>
            )}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`relative flex flex-col ${
                tier.popular ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.pricePerInterview && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tier.pricePerInterview}
                    </p>
                  )}
                  {tier.id === 'unlimited' && (
                    <p className="text-sm text-muted-foreground mt-1">/month</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.popular ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handlePurchase(tier.priceId, tier.name)}
                  disabled={loading !== null || user?.subscriptionStatus === 'unlimited'}
                >
                  {loading === tier.priceId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : user?.subscriptionStatus === 'unlimited' ? (
                    'Already Subscribed'
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ / Info Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div className="bg-card p-4 rounded-lg">
              <h4 className="font-medium mb-2">Do interview packs expire?</h4>
              <p className="text-sm text-muted-foreground">
                No! Your interview credits never expire. Use them whenever you're ready.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg">
              <h4 className="font-medium mb-2">Can I cancel the Pro Unlimited subscription?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel anytime. You'll retain access until the end of your billing period.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg">
              <h4 className="font-medium mb-2">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards through Stripe's secure payment processing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
