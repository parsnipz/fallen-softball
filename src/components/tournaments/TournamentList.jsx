import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '../../lib/utils'
import TournamentForm from './TournamentForm'

export default function TournamentList({ tournaments, loading, onAdd, onArchive, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const activeTournaments = tournaments.filter(t => !t.archived)
  const archivedTournaments = tournaments.filter(t => t.archived)

  const displayedTournaments = showArchived ? tournaments : activeTournaments

  // Get unique existing locations for autocomplete
  const existingLocations = useMemo(() => {
    const locations = tournaments
      .map(t => t.location)
      .filter(Boolean)
    return [...new Set(locations)].sort()
  }, [tournaments])

  const handleFormSubmit = async (tournamentData) => {
    const result = await onAdd(tournamentData)
    if (!result.error) {
      setShowForm(false)
    }
    return result
  }

  const handleDelete = async (id) => {
    const result = await onDelete(id)
    if (!result.error) {
      setDeleteConfirm(null)
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Tournaments</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Create Tournament
        </button>
      </div>

      {/* Filter toggle */}
      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-600">
            Show archived ({archivedTournaments.length})
          </span>
        </label>
      </div>

      {/* Tournament cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedTournaments.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No tournaments yet. Create your first tournament!
          </div>
        ) : (
          displayedTournaments.map((tournament) => (
            <div
              key={tournament.id}
              className={`bg-white shadow rounded-lg p-4 ${tournament.archived ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                >
                  {tournament.name}
                </Link>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    tournament.type === 'coed'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {tournament.type === 'coed' ? 'Coed' : 'Mens'}
                </span>
              </div>

              <p className="text-sm text-gray-500">
                {formatDate(tournament.date)}
              </p>
              {tournament.location && (
                <p className="text-sm text-gray-400 mb-2">
                  {tournament.location}
                </p>
              )}

              <div className="flex justify-between items-center pt-3 border-t mt-3">
                <Link
                  to={`/tournaments/${tournament.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View details
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onArchive(tournament.id, !tournament.archived)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {tournament.archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(tournament)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Tournament Modal */}
      {showForm && (
        <TournamentForm
          existingLocations={existingLocations}
          onSubmit={handleFormSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Tournament</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete "{deleteConfirm.name}"? This will also delete all invitations and documents. This action cannot be undone.
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
