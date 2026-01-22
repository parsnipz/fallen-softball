import { useState, useCallback } from 'react'
import { JERSEY_TYPES, JERSEY_SIZES } from '../../lib/utils'
import AddressAutocomplete from '../common/AddressAutocomplete'

export default function PlayerForm({ player, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    first_name: player?.first_name || '',
    last_name: player?.last_name || '',
    jersey_name: player?.jersey_name || '',
    phone: player?.phone || '',
    email: player?.email || '',
    address: player?.address || '',
    date_of_birth: player?.date_of_birth || '',
    gender: player?.gender || '',
    uniform_number: player?.uniform_number || '',
    jersey_size: player?.jersey_size || '',
    jersey_types: player?.jersey_types || [],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      // Reset jersey size if gender changes and current size doesn't match
      if (name === 'gender' && prev.jersey_size) {
        const currentSizeGender = prev.jersey_size.startsWith('W-') ? 'F' : 'M'
        if (currentSizeGender !== value) {
          updated.jersey_size = ''
        }
      }
      return updated
    })
  }

  const handleJerseyTypeChange = (typeId) => {
    setFormData(prev => ({
      ...prev,
      jersey_types: prev.jersey_types.includes(typeId)
        ? prev.jersey_types.filter(t => t !== typeId)
        : [...prev.jersey_types, typeId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate required fields
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('First name and last name are required')
      setLoading(false)
      return
    }

    // Prepare data
    const submitData = {
      ...formData,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      jersey_name: formData.jersey_name.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      uniform_number: formData.uniform_number ? parseInt(formData.uniform_number, 10) : null,
      jersey_size: formData.jersey_size || null,
    }

    try {
      const result = await onSubmit(submitData)
      if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Get available sizes based on gender
  const availableSizes = formData.gender ? JERSEY_SIZES[formData.gender] : []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {player ? 'Edit Player' : 'Add Player'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 555-5555"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                placeholder="Start typing an address..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jersey Name
                </label>
                <input
                  type="text"
                  name="jersey_name"
                  value={formData.jersey_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uniform #
                </label>
                <input
                  type="number"
                  name="uniform_number"
                  value={formData.uniform_number}
                  onChange={handleChange}
                  min="0"
                  max="99"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jersey Size
                </label>
                <select
                  name="jersey_size"
                  value={formData.jersey_size}
                  onChange={handleChange}
                  disabled={!formData.gender}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">{formData.gender ? 'Select size...' : 'Select gender first'}</option>
                  {availableSizes.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jersey Types
              </label>
              <div className="grid grid-cols-2 gap-2">
                {JERSEY_TYPES.map((type) => (
                  <label key={type.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.jersey_types.includes(type.id)}
                      onChange={() => handleJerseyTypeChange(type.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`w-4 h-4 rounded ${type.color}`}></span>
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
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
                {loading ? 'Saving...' : (player ? 'Update' : 'Add Player')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
