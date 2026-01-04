import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 4, 2026</p>

          <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                System Design Trainer ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">2.1 Information You Provide</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li><strong>Account Information:</strong> Name, email address, and authentication credentials when you create an account</li>
                    <li><strong>Payment Information:</strong> Billing details and payment method information (processed securely through third-party payment processors)</li>
                    <li><strong>Interview Content:</strong> Your responses, diagrams, and other content created during interview sessions</li>
                    <li><strong>Communications:</strong> Messages you send to us through support channels</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">2.2 Automatically Collected Information</h3>
                  <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                    <li><strong>Usage Data:</strong> Information about how you use the Service, including interview sessions, features accessed, and time spent</li>
                    <li><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers</li>
                    <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to track activity on our Service and store certain information</li>
                    <li><strong>Analytics Data:</strong> We use third-party analytics services (such as Sentry) to monitor and analyze usage of our Service</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-2">We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process your transactions and manage your subscription</li>
                <li>Generate AI-powered feedback and insights on your interview performance</li>
                <li>Send you technical notices, updates, security alerts, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our Service</li>
                <li>Detect, prevent, and address technical issues and fraudulent activity</li>
                <li>Personalize and improve your experience with the Service</li>
                <li>Develop new features and functionality</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. How We Share Your Information</h2>
              <p className="text-muted-foreground mb-2">We may share your information in the following circumstances:</p>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong>Service Providers:</strong> We may share your information with third-party service providers who
                  perform services on our behalf, such as payment processing, data analytics, email delivery, hosting services,
                  and customer service.
                </p>
                <p>
                  <strong>AI Service Providers:</strong> Your interview content may be processed by AI service providers
                  (such as OpenAI or Anthropic) to generate feedback and insights. These providers are contractually obligated
                  to protect your data and use it only to provide services to us.
                </p>
                <p>
                  <strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in
                  response to valid requests by public authorities.
                </p>
                <p>
                  <strong>Business Transfers:</strong> If we are involved in a merger, acquisition, or sale of assets, your
                  information may be transferred as part of that transaction.
                </p>
                <p>
                  <strong>With Your Consent:</strong> We may share your information for any other purpose with your consent.
                </p>
              </div>
              <p className="text-muted-foreground mt-2">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your information for as long as necessary to provide the Service and fulfill the purposes described
                in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our
                legal obligations, resolve disputes, and enforce our agreements. Demo sessions that are not claimed may be
                deleted after 7 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your information against unauthorized
                access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication using OAuth 2.0 with Google</li>
                <li>HTTP-only cookies to prevent XSS attacks</li>
                <li>Regular security assessments and monitoring</li>
                <li>Access controls and authentication requirements for our systems</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to
                use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Privacy Rights</h2>
              <p className="text-muted-foreground mb-2">Depending on your location, you may have certain rights regarding your personal information:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong>Access:</strong> You can request access to the personal information we hold about you</li>
                <li><strong>Correction:</strong> You can request that we correct inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> You can request that we delete your personal information</li>
                <li><strong>Data Portability:</strong> You can request a copy of your information in a structured, machine-readable format</li>
                <li><strong>Opt-Out:</strong> You can opt out of receiving promotional communications from us</li>
                <li><strong>Objection:</strong> You can object to our processing of your information in certain circumstances</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                To exercise these rights, please contact us through our support channels. We will respond to your request
                within a reasonable timeframe.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking Technologies</h2>
              <p className="text-muted-foreground">
                We use cookies and similar tracking technologies to track activity on our Service. Cookies are files with a
                small amount of data that are stored on your device. You can instruct your browser to refuse all cookies or
                to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use
                some portions of our Service.
              </p>
              <div className="mt-2 space-y-2 text-muted-foreground">
                <p><strong>Essential Cookies:</strong> Required for authentication and basic functionality</p>
                <p><strong>Analytics Cookies:</strong> Help us understand how users interact with our Service</p>
                <p><strong>Demo Cookies:</strong> Used to maintain state during free demo sessions</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Third-Party Services</h2>
              <p className="text-muted-foreground mb-2">Our Service integrates with third-party services that may collect information:</p>
              <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                <li><strong>Google OAuth:</strong> For authentication (subject to Google's Privacy Policy)</li>
                <li><strong>Stripe:</strong> For payment processing (subject to Stripe's Privacy Policy)</li>
                <li><strong>Sentry:</strong> For error tracking and performance monitoring (subject to Sentry's Privacy Policy)</li>
                <li><strong>AI Providers:</strong> For generating interview content and feedback (subject to their respective privacy policies)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                We recommend reviewing the privacy policies of these third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our Service is not intended for children under the age of 18. We do not knowingly collect personal information
                from children under 18. If you are a parent or guardian and believe your child has provided us with personal
                information, please contact us so we can delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. International Data Transfers</h2>
              <p className="text-muted-foreground">
                Your information may be transferred to and maintained on computers located outside of your state, province,
                country, or other governmental jurisdiction where data protection laws may differ. By using our Service, you
                consent to the transfer of your information to our facilities and to the third parties with whom we share it
                as described in this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground">
                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
                Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy
                Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on
                this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at{' '}
                <a href="mailto:viktor@webkwizards.com" className="text-primary hover:underline">
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
