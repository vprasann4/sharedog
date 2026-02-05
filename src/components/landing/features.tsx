import { Zap, Shield, Globe, Code2 } from 'lucide-react'

const features = [
  {
    name: 'No LLM Costs',
    description: 'Your subscribers use their own AI clients. You provide tools and context—not compute.',
    icon: Zap,
  },
  {
    name: 'MCP Protocol',
    description: 'Works with Claude Desktop, Cursor, ChatGPT, and any MCP-compatible client.',
    icon: Globe,
  },
  {
    name: 'Secure by Design',
    description: 'User credentials encrypted at rest. Rate limiting and input validation built in.',
    icon: Shield,
  },
  {
    name: 'Custom Tools',
    description: 'Connect any API. Use our curated tools or build your own integrations.',
    icon: Code2,
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-32 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Productize Your Expertise
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From playbook to production in minutes, not months.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="relative rounded-2xl border bg-white p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.name}</h3>
              <p className="mt-2 text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
