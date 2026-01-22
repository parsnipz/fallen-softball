import { useState, useMemo } from 'react'

export default function TournamentForm({ tournament, existingLocations = [], onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: tournament?.name || '',
    type: tournament?.type || 'coed',
    location: tournament?.location || '',
    date: tournament?.date || '',
    total_cost: tournament?.total_cost || '',
    venmo_link: tournament?.venmo_link || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)

  // Filter locations based on input
  const filteredLocations = useMemo(() => {
    if (!formData.location) return existingLocations
    const searchLower = formData.location.toLowerCase()
    return existingLocations.filter(loc =>
      loc.toLowerCase().includes(searchLower)
    )
  }, [formData.location, existingLocations])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLocationSelect = (location) => {
    setFormData(prev => ({ ...prev, location }))
    setShowLocationSuggestions(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate required fields
    if (!formData.name.trim() || !formData.date) {
      setError('Tournament name and date are required')
      setLoading(false)
      return
    }

    try {
      const result = await onSubmit({
        name: formData.name.trim(),
        type: formData.type,
        location: formData.location.trim() || null,
        date: formData.date,
        total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
        venmo_link: formData.venmo_link.trim() || null,
      })
      if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {tournament ? 'Edit Tournament' : 'Create Tournament'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tournament Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Summer Bash 2024"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="coed">Coed</option>
                  <option value="mens">Mens</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                onFocus={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                placeholder="e.g., City Sports Complex"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />
              {/* Location suggestions dropdown */}
              {showLocationSuggestions && filteredLocations.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredLocations.map((loc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleLocationSelect(loc)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Type to search existing locations or enter a new one
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    name="total_cost"
                    value={formData.total_cost}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venmo Link
                </label>
                <input
                  type="url"
                  name="venmo_link"
                  value={formData.venmo_link}
                  onChange={handleChange}
                  placeholder="https://venmo.com/u/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (tournament ? 'Update' : 'Create Tournament')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
