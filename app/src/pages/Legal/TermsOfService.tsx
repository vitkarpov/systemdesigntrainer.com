import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <div className="bg-card rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: January 4, 2026
          </p>

          <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground">
                By accessing and using System Design Trainer (the "Service"),
                you accept and agree to be bound by the terms and provision of
                this agreement. If you do not agree to these Terms of Service,
                please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                2. Description of Service
              </h2>
              <p className="text-muted-foreground">
                System Design Trainer provides an AI-powered platform for
                practicing system design interviews. The Service includes
                interactive interview sessions, feedback, performance analytics,
                and related features.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Registration:</strong> You may be required to create
                  an account to access certain features. You agree to provide
                  accurate, current, and complete information during
                  registration.
                </p>
                <p>
                  <strong>Account Security:</strong> You are responsible for
                  maintaining the confidentiality of your account credentials
                  and for all activities that occur under your account.
                </p>
                <p>
                  <strong>Account Termination:</strong> We reserve the right to
                  suspend or terminate your account if you violate these Terms
                  of Service or engage in fraudulent or abusive behavior.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                4. Subscription and Payments
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Free Demo:</strong> We offer a free demo interview to
                  allow you to experience the Service before subscribing.
                </p>
                <p>
                  <strong>Paid Subscriptions:</strong> Access to unlimited
                  interviews and advanced features requires a paid subscription.
                  Subscription fees are charged in advance on a recurring basis.
                </p>
                <p>
                  <strong>Billing:</strong> By providing payment information,
                  you authorize us to charge the applicable fees to your payment
                  method. All fees are non-refundable except as required by law.
                </p>
                <p>
                  <strong>Cancellation:</strong> You may cancel your
                  subscription at any time. Cancellation will take effect at the
                  end of your current billing period.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
              <p className="text-muted-foreground mb-2">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>
                  Use the Service for any unlawful purpose or in violation of
                  any applicable laws
                </li>
                <li>
                  Attempt to gain unauthorized access to any portion of the
                  Service or any other systems or networks
                </li>
                <li>
                  Use automated systems (bots, scripts, etc.) to access the
                  Service without our express written permission
                </li>
                <li>
                  Interfere with or disrupt the Service or servers or networks
                  connected to the Service
                </li>
                <li>
                  Reproduce, duplicate, copy, sell, resell, or exploit any
                  portion of the Service without our express written permission
                </li>
                <li>
                  Share your account credentials with others or allow multiple
                  users to access a single account
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                6. Intellectual Property
              </h2>
              <p className="text-muted-foreground">
                The Service and its original content, features, and
                functionality are owned by System Design Trainer and are
                protected by international copyright, trademark, patent, trade
                secret, and other intellectual property laws. You may not use
                our intellectual property without our express written
                permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                7. AI-Generated Content
              </h2>
              <p className="text-muted-foreground">
                The Service uses artificial intelligence to simulate interview
                conversations and generate feedback. While we strive for
                accuracy, AI-generated content may contain errors or
                inaccuracies. The Service is intended for practice and
                educational purposes only and should not be considered
                professional career advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. User Content</h2>
              <p className="text-muted-foreground">
                You retain ownership of any content you create during interview
                sessions (diagrams, responses, etc.). By using the Service, you
                grant us a license to use, store, and process your content to
                provide the Service and improve our offerings. We may analyze
                aggregated, anonymized data for research and development
                purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Privacy</h2>
              <p className="text-muted-foreground">
                Your privacy is important to us. Please review our{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>{" "}
                to understand how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                10. Disclaimers and Limitations of Liability
              </h2>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>No Warranties:</strong> The Service is provided "as
                  is" and "as available" without warranties of any kind, either
                  express or implied, including but not limited to implied
                  warranties of merchantability, fitness for a particular
                  purpose, and non-infringement.
                </p>
                <p>
                  <strong>Limitation of Liability:</strong> To the maximum
                  extent permitted by law, System Design Trainer shall not be
                  liable for any indirect, incidental, special, consequential,
                  or punitive damages, or any loss of profits or revenues,
                  whether incurred directly or indirectly, or any loss of data,
                  use, goodwill, or other intangible losses resulting from your
                  use of the Service.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                11. Modifications to Terms
              </h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms of Service at any
                time. We will notify you of any material changes by posting the
                new Terms of Service on this page and updating the "Last
                updated" date. Your continued use of the Service after such
                modifications constitutes your acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms of Service shall be governed by and construed in
                accordance with the laws of the jurisdiction in which System
                Design Trainer operates, without regard to its conflict of law
                provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">
                13. Contact Information
              </h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please
                contact us at{" "}
                <a
                  href="mailto:viktor@webkwizards.com"
                  className="text-primary hover:underline"
                >
                  viktor@webkwizards.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
