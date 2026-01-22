import { useState, useMemo } from 'react'

export default function InvitationManager({ uninvitedPlayers, tournamentType, onInvite, onClose }) {
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState(new Set())

  const filteredPlayers = useMemo(() => {
    if (!search) return uninvitedPlayers
    const searchLower = search.toLowerCase()
    return uninvitedPlayers.filter(
      player =>
        player.first_name?.toLowerCase().includes(searchLower) ||
        player.last_name?.toLowerCase().includes(searchLower)
    )
  }, [uninvitedPlayers, search])

  const handleInvite = async (playerId) => {
    setInviting(prev => new Set([...prev, playerId]))
    await onInvite(playerId)
    setInviting(prev => {
      const next = new Set(prev)
      next.delete(playerId)
      return next
    })
  }

  const handleInviteAll = async () => {
    const playerIds = filteredPlayers.map(p => p.id)
    for (const playerId of playerIds) {
      await handleInvite(playerId)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Invite Players</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {tournamentType === 'mens' && (
            <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded mb-3">
              Showing only male players for this mens tournament
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {filteredPlayers.length > 0 && (
              <button
                onClick={handleInviteAll}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Invite All ({filteredPlayers.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {uninvitedPlayers.length === 0
                ? 'All players have been invited'
                : 'No players match your search'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {player.first_name} {player.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.gender === 'M' ? 'Male' : player.gender === 'F' ? 'Female' : '-'}
                      {player.uniform_number && ` • #${player.uniform_number}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvite(player.id)}
                    disabled={inviting.has(player.id)}
                    className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviting.has(player.id) ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
