import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../../backend/server/routers/routes';
import { createContext } from '../../../../../backend/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req, res: undefined as any }),
  });

export { handler as GET, handler as POST };
