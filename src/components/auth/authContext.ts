import { createContext } from 'react';
import { UserProfile } from '../../types';

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
