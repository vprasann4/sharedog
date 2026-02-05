import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">Sharedog</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            How It Works
          </Link>
          <Link href="/marketplace" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Marketplace
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
