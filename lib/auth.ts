import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

/**
 * NextAuth configuration.
 *
 * Supports two sign-in modes:
 *  1. Google OAuth (set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.local)
 *  2. Demo credentials (username: demo, password: demo) — for local testing without OAuth
 *
 * For production with a real DB, swap the credentials provider for a proper
 * adapter (e.g. @auth/prisma-adapter) and remove the demo check.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? 'wealthflow-dev-secret-change-in-production',
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    // ── Google OAuth ─────────────────────────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // ── Demo credentials (always available) ──────────────────────────────────
    CredentialsProvider({
      name: 'Demo Account',
      credentials: {
        email:    { label: 'Email',    type: 'email',    placeholder: 'demo@wealthflow.app' },
        password: { label: 'Password', type: 'password', placeholder: 'demo' },
      },
      async authorize(credentials) {
        // In production: hash-compare against DB. Here: simple demo check.
        if (
          credentials?.email === 'demo@wealthflow.app' &&
          credentials?.password === 'demo'
        ) {
          return { id: 'demo-user-001', name: 'Demo User', email: 'demo@wealthflow.app' };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
