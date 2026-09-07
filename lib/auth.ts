import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByUsername, updateUserLastLogin } from './db'

declare module 'next-auth' {
  interface Session { user: { id: string; username: string; name: string; role: string; avatar?: string; walletAddress?: string } }
  interface User { id: string; username: string; name: string; role: string; avatar?: string; walletAddress?: string }
}

declare module 'next-auth/jwt' {
  interface JWT { id: string; username: string; name: string; role: string; avatar?: string; walletAddress?: string }
}

const authSecret = process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'development' ? 'development-only-secret-change-me' : undefined)
if (!authSecret) throw new Error('NEXTAUTH_SECRET must be configured in production')

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Username and Password',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) return null
          const user = await getUserByUsername(credentials.username)
          if (!user?.password_hash) return null
          const valid = await bcrypt.compare(credentials.password, user.password_hash)
          if (!valid) return null
          await updateUserLastLogin(user.id)
          return { id: user.id, username: user.username, name: user.name, role: user.role, avatar: user.avatar_url, walletAddress: user.tron_wallet_address }
        } catch (error) {
          console.error('Authentication failed', error instanceof Error ? error.message : 'unknown error')
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; token.username = user.username; token.name = user.name; token.role = user.role
        token.avatar = user.avatar; token.walletAddress = user.walletAddress
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.id as string, username: token.username as string, name: token.name as string,
        role: token.role as string, avatar: token.avatar as string | undefined, walletAddress: token.walletAddress as string | undefined,
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: { signIn: '/login', signOut: '/login', error: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  jwt: { secret: authSecret, maxAge: 30 * 24 * 60 * 60 },
  secret: authSecret,
  debug: process.env.NODE_ENV === 'development',
}
