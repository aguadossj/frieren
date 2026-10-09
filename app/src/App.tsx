export default function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">TODO_NAME</h1>
      <p className="text-lg text-white/70">Walking skeleton. Replace me after /kickoff.</p>
      <button
        className="w-full max-w-xs rounded-2xl bg-white py-4 text-lg font-semibold text-black active:scale-95 transition"
        onClick={() => navigator.vibrate?.(20)}
      >
        Start
      </button>
    </main>
  )
}
