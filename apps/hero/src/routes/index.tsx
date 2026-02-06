import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-7xl md:text-9xl font-black text-white mb-6 [letter-spacing:-0.08em]">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            wingmnn
          </span>
        </h1>
        <p className="text-2xl md:text-4xl text-gray-300 font-light">
          Your wingman for winning conversations
        </p>
      </div>
    </div>
  )
}
