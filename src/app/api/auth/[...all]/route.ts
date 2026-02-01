import { auth } from "@/server/auth"; // Better-auth client
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
