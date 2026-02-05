import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20">
          <div className="relative z-10 mx-auto max-w-2xl lg:col-span-7 lg:max-w-none lg:pt-6 xl:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-600 mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Turn your expertise into an AI service</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              Your Methodology,{' '}
              <span className="text-primary">Productized</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              Sharedog lets experts package their methodology into productized
              AI services. Describe your playbook, connect your tools, and
              let subscribers access your expertise through Claude, Cursor,
              or any MCP-compatible client.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link href="/login">
                  Start Building
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>No LLM costs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>MCP Protocol</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon />
                <span>Works with Claude & Cursor</span>
              </div>
            </div>
          </div>
          <div className="relative mt-10 sm:mt-20 lg:col-span-5 lg:row-span-2 lg:mt-0 xl:col-span-6">
            <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🐕</div>
                  <p className="text-slate-500 text-sm">Platform preview coming soon</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 h-20 w-20 rounded-lg bg-white shadow-lg flex items-center justify-center">
                <div className="text-2xl">📋</div>
              </div>
              <div className="absolute bottom-4 left-4 h-16 w-32 rounded-lg bg-white shadow-lg flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-slate-600">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
