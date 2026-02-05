import { FileText, Wrench, Upload, Users } from 'lucide-react'

const steps = [
  {
    step: '01',
    name: 'Describe Your Playbook',
    description: 'Write how you do the work in natural language. The platform parses your methodology into structured steps.',
    icon: FileText,
  },
  {
    step: '02',
    name: 'Connect Your Tools',
    description: 'Choose from curated tools (SEO, research, publishing) or connect any API with custom integrations.',
    icon: Wrench,
  },
  {
    step: '03',
    name: 'Add Knowledge',
    description: 'Upload documents, templates, and examples. Your library becomes searchable context for every request.',
    icon: Upload,
  },
  {
    step: '04',
    name: 'Launch & Earn',
    description: 'Publish to the marketplace. Subscribers connect via MCP and pay monthly for access to your expertise.',
    icon: Users,
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Four simple steps to turn your expertise into a recurring revenue stream.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, index) => (
              <div key={item.name} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-slate-200 -translate-y-1/2" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <item.icon className="h-10 w-10 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary mb-2">{item.step}</span>
                  <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
