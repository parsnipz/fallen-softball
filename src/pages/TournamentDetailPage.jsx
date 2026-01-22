import { useParams } from 'react-router-dom'
import { useTournamentDetail } from '../hooks/useTournaments'
import { usePlayers } from '../hooks/usePlayers'
import TournamentDetail from '../components/tournaments/TournamentDetail'

export default function TournamentDetailPage() {
  const { id } = useParams()
  const {
    tournament,
    invitations,
    documents,
    loading: tournamentLoading,
    error: tournamentError,
    invitePlayer,
    updateInvitationStatus,
    removeInvitation,
    addDocument,
    deleteDocument,
  } = useTournamentDetail(id)

  const { players, loading: playersLoading } = usePlayers()

  const loading = tournamentLoading || playersLoading

  if (tournamentError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        Error loading tournament: {tournamentError}
      </div>
    )
  }

  return (
    <TournamentDetail
      tournament={tournament}
      invitations={invitations}
      documents={documents}
      loading={loading}
      players={players}
      onInvitePlayer={invitePlayer}
      onUpdateStatus={updateInvitationStatus}
      onRemoveInvitation={removeInvitation}
      onAddDocument={addDocument}
      onDeleteDocument={deleteDocument}
    />
  )
}
