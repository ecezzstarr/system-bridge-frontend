import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByUsername, updateUserLastLogin } from './db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      name: string
      role: string
      avatar?: string
      walletAddress?: string
    }
  }
  interface User {
    id: string
    username: string
    name: string
    role: string
    avatar?: string
    walletAddress?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    name: string
    role: string
    avatar?: string
    walletAddress?: string
  }
}

// Username and Password Authentication
const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    id: 'credentials',
    name: 'Username and Password',
    credentials: {
      username: { label: 'Username', type: 'text', placeholder: 'admin' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      try {
        console.log('[v0] Authorize called with username:', credentials?.username)
        
        if (!credentials?.username || !credentials?.password) {
          console.log('[v0] Missing credentials')
          return null
        }

        // Get user from Neon database
        console.log('[v0] Looking up user in database...')
        const user = await getUserByUsername(credentials.username)
        console.log('[v0] User found:', user ? 'yes' : 'no')
        
        if (!user) {
          console.log('[v0] No user found for username:', credentials.username)
          return null
        }

        if (!user.password_hash) {
          console.log('[v0] User has no password')
          return null
        }

        // Verify password
        console.log('[v0] Verifying password...')
        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        console.log('[v0] Password valid:', isValid)
        
        if (!isValid) {
          console.log('[v0] Invalid password')
          return null
        }

        // Update last login
        await updateUserLastLogin(user.id)
        console.log('[v0] Login successful for:', user.username)

        return {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar_url,
          walletAddress: user.tron_wallet_address,
        }
      } catch (error) {
        console.error('[v0] Authorize error:', error)
        return null
      }
    },
  }),
]

export const authOptions: NextAuthOptions = {
  providers,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.name = user.name
        token.role = user.role
        token.avatar = user.avatar
        token.walletAddress = user.walletAddress
      }
      return token
    },

    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        username: token.username as string,
        name: token.name as string,
        role: token.role as string,
        avatar: token.avatar as string | undefined,
        walletAddress: token.walletAddress as string | undefined,
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },

  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',

  debug: process.env.NODE_ENV === 'development',
}
