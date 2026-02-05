import { LoginForm } from '@/components/auth/login-form'
import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Login | Sharedog',
  description: 'Sign in to your Sharedog account',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md space-y-6 p-6">
        <div className="space-y-2 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold">Sharedog</h1>
          </Link>
          <h2 className="text-xl font-semibold">Welcome back</h2>
          <p className="text-muted-foreground">
            Sign in to continue to Sharedog
          </p>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
    </div>
  )
}
