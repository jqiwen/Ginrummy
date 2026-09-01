'use client';

import { Provider } from 'react-redux';
import { AuthSessionProvider } from '@/lib/auth/auth-session-provider';
import store from './store'

interface ClientProviderProps {
  children: React.ReactNode;
}

const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </Provider>
  );
};

export default ClientProvider;
