import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import Dashboard from './pages/Dashboard/Dashboard';
import Interview from './pages/Interview/Interview';
import Feedback from './pages/Feedback/Feedback';
import Login from './pages/Auth/Login';
import Callback from './pages/Auth/Callback';
import AuthError from './pages/Auth/Error';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<Callback />} />
      <Route path="/auth/error" element={<AuthError />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:sessionId"
        element={
          <ProtectedRoute>
            <Interview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback/:sessionId"
        element={
          <ProtectedRoute>
            <Feedback />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
