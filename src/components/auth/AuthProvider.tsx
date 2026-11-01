import { useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile } from '../../types';
import { authService } from '../../services/authService';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = authService.isConfigured();

  // Check active session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      if (!isConfigured) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        if (isMounted) {
          setUser(null);
          setError(err instanceof Error ? err.message : 'Unable to verify the Entra ID session.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [isConfigured]);

  const login = useCallback(async () => {
    setError(null);
    if (!isConfigured) {
      const msg = 'Microsoft Entra ID is not configured. Set the client ID, tenant ID, and backend API scope.';
      setError(msg);
      throw new Error(msg);
    }

    setIsLoading(true);
    try {
      const authenticatedUser = await authService.signIn();
      setUser(authenticatedUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  const logout = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microsoft Entra ID sign-out failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isConfigured,
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
