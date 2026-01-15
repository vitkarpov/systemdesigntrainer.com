import { useEffect } from 'react';

const Signup = () => {
  useEffect(() => {
    // Redirect to the main website signup page
    window.location.href = 'https://systemdesigntrainer.com';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Redirecting...
          </h2>
          <p className="mt-2 text-gray-600">
            Taking you to System Design Trainer
          </p>
          <p className="mt-4 text-sm text-gray-500">
            If you're not redirected automatically,{' '}
            <a
              href="https://systemdesigntrainer.com"
              className="text-blue-600 hover:text-blue-500 hover:underline"
            >
              click here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
