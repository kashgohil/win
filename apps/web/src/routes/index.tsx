import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Index })

function Index() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-semibold text-foreground">Win</h1>
    </div>
  )
}
