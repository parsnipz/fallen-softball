import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, getStatusColor, exportToCSV } from '../../lib/utils'
import InvitationManager from './InvitationManager'
import StatusToggle from './StatusToggle'
import MessageThreadCreator from '../messaging/MessageThreadCreator'
import DocumentUpload from '../messaging/DocumentUpload'

export default function TournamentDetail({
  tournament,
  invitations,
  documents,
  loading,
  players,
  onInvitePlayer,
  onUpdateStatus,
  onRemoveInvitation,
  onAddDocument,
  onDeleteDocument,
}) {
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return invitations.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1
        return acc
      },
      { pending: 0, in: 0, out: 0 }
    )
  }, [invitations])

  // Sort invitations by status (in first, then pending, then out) and name
  const sortedInvitations = useMemo(() => {
    const statusOrder = { in: 0, pending: 1, out: 2 }
    return [...invitations].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      return a.player?.last_name?.localeCompare(b.player?.last_name) || 0
    })
  }, [invitations])

  // Get uninvited players (filtered by tournament type)
  const uninvitedPlayers = useMemo(() => {
    const invitedIds = new Set(invitations.map(inv => inv.player_id))
    return players.filter(player => {
      // Not already invited
      if (invitedIds.has(player.id)) return false
      // For mens tournaments, only show male players
      if (tournament?.type === 'mens' && player.gender !== 'M') return false
      return true
    })
  }, [players, invitations, tournament?.type])

  const handleExportRoster = () => {
    const rosterData = sortedInvitations
      .filter(inv => inv.status === 'in')
      .map(inv => ({
        'Last Name': inv.player?.last_name || '',
        'First Name': inv.player?.first_name || '',
        'Date of Birth': inv.player?.date_of_birth || '',
        'Phone': inv.player?.phone || '',
        'Email': inv.player?.email || '',
        'Address': inv.player?.address || '',
      }))

    if (rosterData.length === 0) {
      alert('No players are marked as "In" to export')
      return
    }

    const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_roster`
    exportToCSV(rosterData, filename)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tournament not found</p>
        <Link to="/tournaments" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          Back to tournaments
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/tournaments"
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to tournaments
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  tournament.type === 'coed'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {tournament.type === 'coed' ? 'Coed' : 'Mens'}
              </span>
              {tournament.archived && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">
                  Archived
                </span>
              )}
            </div>
            <p className="text-gray-500">
              {formatDate(tournament.date)}
              {tournament.location && ` • ${tournament.location}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportRoster}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export Roster
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Invite Players
            </button>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{statusCounts.in}</div>
          <div className="text-sm text-green-600">In</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{statusCounts.pending}</div>
          <div className="text-sm text-yellow-600">Pending</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{statusCounts.out}</div>
          <div className="text-sm text-red-600">Out</div>
        </div>
      </div>

      {/* Messaging */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Messaging</h2>
        <MessageThreadCreator invitations={invitations} />
      </div>

      {/* Documents */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
        <DocumentUpload
          tournamentId={tournament.id}
          documents={documents}
          onAdd={onAddDocument}
          onDelete={onDeleteDocument}
        />
      </div>

      {/* Invited Players */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Invited Players ({invitations.length})
          </h2>
        </div>

        {sortedInvitations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No players invited yet. Click "Invite Players" to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(invitation.status)}`}
                  >
                    {invitation.status}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {invitation.player?.first_name} {invitation.player?.last_name}
                    </div>
                    {invitation.player?.phone && (
                      <div className="text-sm text-gray-500">{invitation.player.phone}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusToggle
                    status={invitation.status}
                    onChange={(status) => onUpdateStatus(invitation.id, status)}
                  />
                  <button
                    onClick={() => onRemoveInvitation(invitation.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Players Modal */}
      {showInviteModal && (
        <InvitationManager
          uninvitedPlayers={uninvitedPlayers}
          tournamentType={tournament.type}
          onInvite={onInvitePlayer}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}
