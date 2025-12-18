import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAccessToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const state = searchParams.get('state');

    if (token) {
      setAccessToken(token);

      // Redirect to the original page or home
      const redirectTo = state || '/';
      navigate(redirectTo, { replace: true });
    } else {
      // No token, redirect to error page
      navigate('/auth/error', { replace: true });
    }
  }, [searchParams, setAccessToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default Callback;
