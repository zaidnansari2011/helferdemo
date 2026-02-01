import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, magicLink, phoneNumber } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";
import { msg91OTP } from "msg91-lib";
import {
  BASE_URL,
  BETTER_AUTH_SECRET,
  MSG91_API_KEY,
  MSG91_TEMPLATE_ID,
  IS_DEVELOPMENT,
} from "./config";
import { Resend } from "resend";
import { authLogger } from "./utils/logger";

const prisma = new PrismaClient();

// Only initialize MSG91 in production or when API key is available
const msg91otp = IS_DEVELOPMENT && !MSG91_API_KEY
  ? null
  : new msg91OTP({
      authKey: MSG91_API_KEY || 'dummy-key-for-dev',
      templateId: MSG91_TEMPLATE_ID || 'dummy-template',
    });

// Use BASE_URL from config (where backend actually runs - localhost:4000)
const APP_URL = process.env.NODE_ENV === "production" ? "https://helfer.in" : BASE_URL;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),

  secret: BETTER_AUTH_SECRET,
  baseURL: APP_URL,

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }, request) => {
        try {
          // DEMO MODE: Always use OTP 123456 for testing
          const isDemoMode = process.env.DEMO_MODE === 'true';
          if (isDemoMode) {
            authLogger.debug(`[DEMO MODE] OTP for ${phoneNumber}: 123456 (fixed demo OTP)`);
            return; // Return successfully - demo mode doesn't need real OTP
          }

          // Remove any non-digit characters and ensure it's in international format
          const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, "");

          // MSG91 expects numbers in international format (with country code)
          // If the number doesn't start with country code, assume Indian number (+91)
          const formattedNumber = cleanPhoneNumber.startsWith("91")
            ? cleanPhoneNumber
            : `91${cleanPhoneNumber}`;

          authLogger.debug(`Sending OTP to ${formattedNumber} via MSG91`);
          
          // In development, just log the OTP and skip MSG91 (but don't return early!)
          if (process.env.NODE_ENV !== "production") {
            authLogger.debug(`[DEV] OTP for ${phoneNumber}: ${code}`);
            return; // Return successfully - Better Auth already stored the OTP
          }
          
          // Send OTP using MSG91 in production
          if (!msg91otp) {
            throw new Error("MSG91 not configured");
          }

          const response = await msg91otp.send(formattedNumber, {
            templateId: MSG91_TEMPLATE_ID,
            expiry: 5, // 5 minutes expiry
            extra_param: {
              OTP: code,
            },
          });

          authLogger.debug("MSG91 Response:", response);
        } catch (error) {
          console.error("MSG91 Error:", error);

          // In development, log the OTP code as fallback
          if (IS_DEVELOPMENT) {
            authLogger.debug(`[DEV] OTP for ${phoneNumber}: ${code}`);
            return;
          }

          throw new Error("Failed to send OTP via SMS");
        }
      },
      // Optional: Set OTP length and expiry
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      
      // Override verification in demo mode
      verifyOTP: async ({ phoneNumber, code }) => {
        const isDemoMode = process.env.DEMO_MODE === 'true';
        if (isDemoMode && code === '123456') {
          authLogger.debug(`[DEMO MODE] Accepting demo OTP 123456 for ${phoneNumber}`);
          return true; // Accept demo OTP
        }
        // Return undefined to use default verification
        return undefined;
      },

      // Optional: Allow sign up with phone number
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => {
          // Generate a temporary email from phone number
          return `${phoneNumber.replace(/[^0-9]/g, "")}@temp.blinkit.com`;
        },
        getTempName: (phoneNumber) => {
          return `User_${phoneNumber.replace(/[^0-9]/g, "")}`;
        },
      },

      // Callback after successful verification
      callbackOnVerification: async ({ phoneNumber, user }, ctx) => {
        authLogger.debug(`[Auth] Phone verified successfully: ${phoneNumber}`);
        authLogger.debug(`[Auth] User created/found: ${JSON.stringify(user)}`);
      },

      // Optional: Require phone verification before sign in
      requireVerification: true,

      // Optional: Limit verification attempts to prevent brute force
      allowedAttempts: 3,
    }),

    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        authLogger.debug(`Sending OTP to ${email}`);

        if (process.env.NODE_ENV !== "production") {
          return;
        }
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: "Helfer <hello@helfer.app>",
          replyTo: "support@helfer.app",
          to: email,
          subject: "Log in to Helfer with this OTP",
          text: `Log in to Helfer with this OTP ${otp}`,
        });
      },
    }),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production"
          ? "helfer.in"
          : undefined,
    },
    disableCSRFCheck: IS_DEVELOPMENT, // Disable CSRF check in development for mobile apps
  },
  trustedOrigins: [
    "http://api.helfer.local",
    "http://helfer.local",
    "https://helfer.in",
    "http://localhost:3000",
    "http://localhost:4000", // Backend URL for cookie access
    "http://localhost:8081",
    "http://192.168.0.101:8081",
    "http://192.168.0.101:3000",
  ],

  // Optional: Configure session settings
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    updateAge: 60 * 60 * 24, // 24 hours
    cookieAttributes: {
      sameSite: IS_DEVELOPMENT ? "lax" : "strict", // Allow cross-origin in dev
      secure: !IS_DEVELOPMENT, // Require HTTPS in production
      domain: IS_DEVELOPMENT ? undefined : "helfer.in", // Don't set domain in dev for localhost
    },
  },
});

export type Auth = typeof auth;
