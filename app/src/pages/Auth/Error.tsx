import { Link, useSearchParams } from 'react-router-dom';

const AuthError = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Map error codes to user-friendly messages
  const getErrorMessage = () => {
    if (error === 'access_denied') {
      return 'You cancelled the sign in process. No worries, you can try again whenever you\'re ready.';
    }
    if (errorDescription) {
      return errorDescription;
    }
    return 'We couldn\'t complete your sign in. Please try again.';
  };

  const getErrorTitle = () => {
    if (error === 'access_denied') {
      return 'Sign In Cancelled';
    }
    return 'Authentication Failed';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="text-red-600">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {getErrorTitle()}
          </h2>
          <p className="mt-2 text-gray-600">
            {getErrorMessage()}
          </p>
        </div>

        <Link
          to="/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </Link>
      </div>
    </div>
  );
};

export default AuthError;
