import { credentialStamp } from '@/lib/session-security'
import { consumeAuthAttempt } from '@/lib/auth-throttle'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { usableBcryptPasswordHash } from '@/lib/password-hash'
import { getUserByUsername, updateUserLastLogin } from './db'
import { getDivineShieldState } from './weave-infrastructure'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      credentialStamp?: string
      username: string
      name: string
      role: string
      avatar?: string
      walletAddress?: string
    }
  }
  interface User {
    credentialStamp?: string
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
    credentialStamp?: string
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
        
        if (!credentials?.username || !credentials?.password || credentials.username.length > 254 || credentials.password.length > 1024) {
          return null
        }

        const attempt = await consumeAuthAttempt('login-username', credentials.username)
        if (!attempt.allowed) return null

        // Get user from current WEAVE database
        const user = await getUserByUsername(credentials.username)
        
        if (!user) {
          return null
        }

        const passwordHash = usableBcryptPasswordHash(user.password_hash)

        if (!passwordHash) {
          return null
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, passwordHash)
        
        if (!isValid) {
          return null
        }

        // Authentication stays available; the shared API runtime access
        // enforces the Shield for non-Administrations operations.
        await getDivineShieldState()

        // Update last login
        await updateUserLastLogin(user.id)

        return {
          id: user.id,
          credentialStamp: credentialStamp(user.password_hash) || undefined,
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar_url,
          walletAddress: user.tron_wallet_address,
        }
      } catch (error) {
        console.error('[WEAVE] Authorize error:', error)
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
        token.credentialStamp = user.credentialStamp
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
        credentialStamp: token.credentialStamp,
        username: token.username as string,
        name: token.name as string,
        role: token.role as string,
        avatar: token.avatar as string | undefined,
        walletAddress: token.walletAddress as string | undefined,
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
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
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60,
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
}
