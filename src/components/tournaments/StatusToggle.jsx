export default function StatusToggle({ status, onChange }) {
  const statuses = ['in', 'pending', 'out']

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-300">
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
            status === s
              ? s === 'in'
                ? 'bg-green-600 text-white'
                : s === 'out'
                ? 'bg-red-600 text-white'
                : 'bg-yellow-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
