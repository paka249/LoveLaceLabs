import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  async function handleSuccess(credentialResponse) {
    setError(null);
    try {
      await login(credentialResponse.credential);
      navigate('/');
    } catch {
      setError("Couldn't verify that sign-in, try again.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-on-surface">
      <h1 className="text-2xl font-bold text-primary">Sign in to LovelaceLabs</h1>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("Couldn't verify that sign-in, try again.")}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
