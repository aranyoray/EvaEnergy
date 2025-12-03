import React, { useState } from 'react';
import { signIn, getCsrfToken } from 'next-auth/react';
import type { SignInResponse } from 'next-auth/react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import "../App.css";

// Define the props type for the component
interface SignInProps {
  csrfToken: string;
}

const LoginScreen: React.FC<SignInProps> = ({ csrfToken }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result: SignInResponse | undefined = await signIn('credentials', {
      redirect: false, // Prevents automatic redirect, allowing manual handling
      username,
      password,
      // You can add a callbackUrl here if needed, e.g., router.query.callbackUrl as string || '/'
    });

    if (result?.error) {
      // Handle login error
      setError(result.error);
    } else if (result?.ok) {
      // Handle successful login
      // Redirect the user to the desired page (e.g., dashboard or callbackUrl)
      router.push((router.query.callbackUrl as string) || '/');
    }
  };

  return (
    
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', width: '300px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h2>Sign In</h2>
        
        {/* Hidden input for CSRF token */}
        <input name="csrfToken" type="hidden" defaultValue={csrfToken} />

        <label htmlFor="username" style={{ marginBottom: '5px' }}>Username:</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{ marginBottom: '15px', padding: '8px' }}
        />

        <label htmlFor="password" style={{ marginBottom: '5px' }}>Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ marginBottom: '15px', padding: '8px' }}
        />

        <button type="submit" style={{ padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Sign In
        </button>

        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      </form>
    </div>
  );
};

// Function to fetch the CSRF token on the server side
export const getServerSideProps: GetServerSideProps = async (context) => {
  const csrfToken = await getCsrfToken(context);
  return {
    props: { csrfToken: csrfToken || null },
  };
};

export default LoginScreen;