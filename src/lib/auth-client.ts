import { createAuthClient } from 'better-auth/react';

import { API_BASE_URL } from './config';
import { phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    phoneNumberClient(),
  ],
  fetchOptions: {
    credentials: 'include',
  },
});

export const { signIn, signUp, signOut, useSession, getSession, } = authClient;
