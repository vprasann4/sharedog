import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-20 sm:py-32 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Productize Your Expertise?
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Join creators who are turning their methodologies into scalable AI services.
            Start building your first service today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
              <Link href="/login">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-700 text-white hover:bg-slate-800"
            >
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
