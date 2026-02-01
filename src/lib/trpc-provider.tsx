"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { authClient } from "./auth-client";
import { type AppRouter } from "../../../backend/server/routers/routes";
import { API_BASE_URL } from "./config";
import superjson from "superjson";
import { useState, useEffect, useRef } from "react";

// bun install @trpc/tanstack-react-query @tanstack/react-query @trpc/server

// Create a stable query client that can be reset
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Singleton for server-side and initial client-side
let browserQueryClient: QueryClient | undefined = undefined;

export const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always create a new query client
    return createQueryClient();
  }
  // Browser: create once and reuse
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
};

// Function to clear all cached queries (call on logout/user change)
export const clearQueryCache = () => {
  if (browserQueryClient) {
    browserQueryClient.clear();
  }
};

// Function to invalidate all seller queries
export const invalidateSellerQueries = () => {
  if (browserQueryClient) {
    browserQueryClient.invalidateQueries({ queryKey: ['seller'] });
    browserQueryClient.invalidateQueries({ queryKey: ['analytics'] });
  }
};

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      // In production on Vercel, use relative /api/trpc
      // In development, use separate backend server
      url: process.env.NODE_ENV === 'production' 
        ? '/api/trpc'
        : `${API_BASE_URL}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
      transformer: superjson,
    }),
  ],
});

// We need a stable reference for the query client
export const queryClient = getQueryClient();

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export function TRPCProvider(props: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);
  
  // Get current session to track user changes
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id || null;
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Clear cache when user changes (login/logout or different user)
  useEffect(() => {
    if (mounted && previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      // User changed - clear all cached data
      console.log('[TRPC] User changed, clearing cache');
      clearQueryCache();
    }
    previousUserIdRef.current = currentUserId;
  }, [currentUserId, mounted]);
  
  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
}
