'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-4">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800">
          Try again
        </button>
      </div>
    </div>
  )
}
