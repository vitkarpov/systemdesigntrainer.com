import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            System Design Interview Simulator
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Practice real system design interviews under pressure — before the real one
          </p>

          {/* Hero Screenshot */}
          <div className="mb-8 rounded-lg overflow-hidden shadow-2xl border border-gray-200">
            <img
              src="/images/hero-screenshot.png"
              alt="Interview simulator interface"
              className="w-full"
            />
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            See what you'll get
          </h2>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="rounded-lg overflow-hidden shadow-xl border border-gray-200">
                  <img
                    src="/images/step-1-selection.png"
                    alt="Select interview case"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="bg-blue-600 text-white inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  Step 1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Choose Your Challenge
                </h3>
                <p className="text-gray-600 text-lg">
                  Pick from real system design problems asked at FAANG companies.
                  Each case is carefully crafted to test the right signals.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="bg-blue-600 text-white inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  Step 2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Face the AI Interviewer
                </h3>
                <p className="text-gray-600 text-lg">
                  Experience a realistic 45-minute interview with an AI that interrupts,
                  challenges assumptions, and pushes you like a real interviewer.
                </p>
              </div>
              <div>
                <div className="rounded-lg overflow-hidden shadow-xl border border-gray-200">
                  <img
                    src="/images/step-2-interview.png"
                    alt="Live interview session"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="rounded-lg overflow-hidden shadow-xl border border-gray-200">
                  <img
                    src="/images/step-3-interview.png"
                    alt="Detailed feedback report"
                    className="w-full"
                  />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="bg-blue-600 text-white inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  Step 3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Get Actionable Feedback
                </h3>
                <p className="text-gray-600 text-lg">
                  Receive a detailed breakdown of what went wrong, what you missed,
                  and exactly what to improve for your next interview.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ready to practice?
              </h2>
              <p className="text-gray-600">
                Start with 1 free interview — no credit card required
              </p>
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-lg"
            >
              <svg
                className="w-6 h-6 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.165 20 14.418 20 10c0-5.523-4.477-10-10-10z"
                  clipRule="evenodd"
                />
              </svg>
              Sign in with GitHub to start
            </button>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 text-center">
                What you'll get:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  1 free practice interview
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Real-time AI interviewer that applies pressure
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Detailed feedback report with actionable insights
                </li>
              </ul>
            </div>

            <p className="text-xs text-center text-gray-500 mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
