import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByUsername, updateUserLastLogin } from './db'
import { getDivineShieldState } from './weave-infrastructure'

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

function hasUsablePasswordHash(value: unknown) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value || ''))
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
        console.log('[WEAVE] Authorize called with username:', credentials?.username)
        
        if (!credentials?.username || !credentials?.password) {
          console.log('[WEAVE] Missing credentials')
          return null
        }

        // Get user from current WEAVE database
        console.log('[WEAVE] Looking up user in database...')
        const user = await getUserByUsername(credentials.username)
        console.log('[WEAVE] User found:', user ? 'yes' : 'no')
        
        if (!user) {
          console.log('[WEAVE] No user found for username:', credentials.username)
          return null
        }

        if (!hasUsablePasswordHash(user.password_hash)) {
          console.log('[WEAVE] User requires password setup/recovery')
          return null
        }

        // Verify password
        console.log('[WEAVE] Verifying password...')
        const isValid = await bcrypt.compare(credentials.password, user.password_hash)
        console.log('[WEAVE] Password valid:', isValid)
        
        if (!isValid) {
          console.log('[WEAVE] Invalid password')
          return null
        }

        const shield=await getDivineShieldState()
        if(shield.active && user.role!=='admin') {
          console.log('[auth] Divine Shield blocked non-admin credential session')
          return null
        }

        // Update last login
        await updateUserLastLogin(user.id)
        console.log('[WEAVE] Login successful for:', user.username)

        return {
          id: user.id,
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
