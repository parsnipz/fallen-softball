import { exportToCSV } from '../../lib/utils'

export default function ExportButton({ data, filename, label = 'Export CSV', disabled = false }) {
  const handleExport = () => {
    if (!data || data.length === 0) return
    exportToCSV(data, filename)
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data || data.length === 0}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  )
}
