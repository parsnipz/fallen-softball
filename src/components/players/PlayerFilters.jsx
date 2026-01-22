export default function PlayerFilters({ filters, onChange, jerseyTypes }) {
  const handleSearchChange = (e) => {
    onChange({ ...filters, search: e.target.value })
  }

  const handleGenderChange = (e) => {
    onChange({ ...filters, gender: e.target.value })
  }

  const handleJerseyTypeChange = (typeId) => {
    const newTypes = filters.jerseyTypes.includes(typeId)
      ? filters.jerseyTypes.filter(t => t !== typeId)
      : [...filters.jerseyTypes, typeId]
    onChange({ ...filters, jerseyTypes: newTypes })
  }

  const clearFilters = () => {
    onChange({ search: '', gender: '', jerseyTypes: [] })
  }

  const hasActiveFilters = filters.search || filters.gender || filters.jerseyTypes.length > 0

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search by name, email, address, or phone..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Gender */}
        <div className="w-full sm:w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gender
          </label>
          <select
            value={filters.gender}
            onChange={handleGenderChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
      </div>

      {/* Jersey Types */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Jersey Types
        </label>
        <div className="flex flex-wrap gap-2">
          {jerseyTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleJerseyTypeChange(type.id)}
              className={`flex items-center gap-2 px-3 py-1 text-sm rounded-full border transition-colors ${
                filters.jerseyTypes.includes(type.id)
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className={`w-3 h-3 rounded ${type.color}`}></span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
