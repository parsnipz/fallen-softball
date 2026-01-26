import { useState, useMemo } from 'react'
import { formatPhone, formatDate, JERSEY_TYPES, getJerseyType, exportToCSV } from '../../lib/utils'
import PlayerForm from './PlayerForm'
import PlayerFilters from './PlayerFilters'

export default function PlayerList({ players, loading, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [sortField, setSortField] = useState('last_name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [filters, setFilters] = useState({
    search: '',
    gender: '',
    jerseyTypes: [],
  })

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          player.first_name?.toLowerCase().includes(searchLower) ||
          player.last_name?.toLowerCase().includes(searchLower) ||
          player.jersey_name?.toLowerCase().includes(searchLower) ||
          player.email?.toLowerCase().includes(searchLower) ||
          player.address?.toLowerCase().includes(searchLower) ||
          player.phone?.includes(filters.search)
        if (!matchesSearch) return false
      }

      // Gender filter
      if (filters.gender && player.gender !== filters.gender) {
        return false
      }

      // Jersey type filter
      if (filters.jerseyTypes.length > 0) {
        const hasMatchingJersey = filters.jerseyTypes.some(
          type => player.jersey_types?.includes(type)
        )
        if (!hasMatchingJersey) return false
      }

      return true
    })
  }, [players, filters])

  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredPlayers, sortField, sortDirection])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleEdit = (player) => {
    setEditingPlayer(player)
    setShowForm(true)
  }

  const handleFormSubmit = async (playerData) => {
    if (editingPlayer) {
      const result = await onUpdate(editingPlayer.id, playerData)
      if (!result.error) {
        setShowForm(false)
        setEditingPlayer(null)
      }
      return result
    } else {
      const result = await onAdd(playerData)
      if (!result.error) {
        setShowForm(false)
      }
      return result
    }
  }

  const handleDelete = async (id) => {
    const result = await onDelete(id)
    if (!result.error) {
      setDeleteConfirm(null)
    }
  }

  const handleExport = () => {
    const exportData = sortedPlayers.map(p => ({
      'First Name': p.first_name,
      'Last Name': p.last_name,
      'Jersey Name': p.jersey_name || '',
      'Phone': p.phone || '',
      'Email': p.email || '',
      'Address': p.address || '',
      'Date of Birth': p.date_of_birth || '',
      'Gender': p.gender || '',
      'Uniform Number': p.uniform_number || '',
      'Jersey Size': p.jersey_size || '',
      'Jersey Types': p.jersey_types?.join('; ') || '',
    }))
    exportToCSV(exportData, 'players')
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400 ml-1">↕</span>
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  // Render jersey type color squares
  const JerseySquares = ({ types }) => {
    if (!types || types.length === 0) return <span className="text-gray-400">-</span>
    return (
      <div className="flex gap-1">
        {JERSEY_TYPES.map((jt) => {
          const hasType = types.includes(jt.id)
          return (
            <div
              key={jt.id}
              title={hasType ? jt.label : `No ${jt.label}`}
              className={`w-4 h-4 rounded ${hasType ? jt.color : 'bg-gray-200'} ${hasType ? '' : 'opacity-30'}`}
            />
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Players</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={sortedPlayers.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => { setEditingPlayer(null); setShowForm(true) }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Player
          </button>
        </div>
      </div>

      <PlayerFilters
        filters={filters}
        onChange={setFilters}
        jerseyTypes={JERSEY_TYPES}
      />

      <div className="text-sm text-gray-500 mb-2">
        Showing {sortedPlayers.length} of {players.length} players
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('last_name')}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Name <SortIcon field="last_name" />
                </th>
                <th
                  onClick={() => handleSort('date_of_birth')}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  DOB <SortIcon field="date_of_birth" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Email <SortIcon field="email" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th
                  onClick={() => handleSort('uniform_number')}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Uniform <SortIcon field="uniform_number" />
                </th>
                <th
                  onClick={() => handleSort('jersey_size')}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Size <SortIcon field="jersey_size" />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jerseys
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-14">
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {players.length === 0 ? 'No players yet. Add your first player!' : 'No players match your filters.'}
                  </td>
                </tr>
              ) : (
                sortedPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-gray-900">
                        {player.first_name} {player.last_name}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">
                      {player.date_of_birth ? formatDate(player.date_of_birth) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 max-w-[150px]">
                      {player.address ? (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(player.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate block text-blue-600 hover:text-blue-800 hover:underline"
                          title={`Get directions to ${player.address}`}
                        >
                          {player.address}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 max-w-[150px]">
                      <div className="truncate" title={player.email || ''}>
                        {player.email || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">
                      {player.phone ? (
                        <a
                          href={`sms:${player.phone.replace(/\D/g, '')}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          title="Send text message"
                        >
                          {formatPhone(player.phone)}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">
                      {player.uniform_number && (
                        <span className="font-medium">#{player.uniform_number}</span>
                      )}
                      {player.jersey_name && (
                        <span className="text-gray-400 ml-1">"{player.jersey_name}"</span>
                      )}
                      {!player.uniform_number && !player.jersey_name && '-'}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">
                      {player.jersey_size || '-'}
                    </td>
                    <td className="px-2 py-1.5">
                      <JerseySquares types={player.jersey_types} />
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(player)}
                        className="text-gray-400 hover:text-blue-600 p-0.5"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(player)}
                        className="text-gray-400 hover:text-red-600 p-0.5 ml-0.5"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Form Modal */}
      {showForm && (
        <PlayerForm
          player={editingPlayer}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditingPlayer(null) }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Player</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete {deleteConfirm.first_name} {deleteConfirm.last_name}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
