import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Base | Sharedog',
  description: 'Discover and connect AI-powered knowledge bases',
}

export default function PublicKBLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
