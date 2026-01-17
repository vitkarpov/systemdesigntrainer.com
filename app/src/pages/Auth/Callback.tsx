import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Token is now stored in HTTP-only cookie by backend
    // Just handle the redirect based on state parameter
    const state = searchParams.get("state");
    const redirectTo = state || "/";

    // Wait a moment for the cookie to be set and then redirect
    setTimeout(() => {
      navigate(redirectTo, { replace: true });
    }, 100);
  }, [searchParams, navigate]);

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
