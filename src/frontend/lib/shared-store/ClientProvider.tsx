'use client';

import { Provider } from 'react-redux';
import { AuthSessionProvider } from '@/lib/auth/auth-session-provider';
import { InvitationProvider } from '@/lib/invites/invitation-provider';
import store from './store'

interface ClientProviderProps {
  children: React.ReactNode;
}

const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <AuthSessionProvider>
        <InvitationProvider>{children}</InvitationProvider>
      </AuthSessionProvider>
    </Provider>
  );
};

export default ClientProvider;
