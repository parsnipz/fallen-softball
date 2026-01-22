import { useTournaments } from '../hooks/useTournaments'
import TournamentList from '../components/tournaments/TournamentList'

export default function TournamentsPage() {
  const { tournaments, loading, error, addTournament, archiveTournament, deleteTournament } = useTournaments()

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        Error loading tournaments: {error}
      </div>
    )
  }

  return (
    <TournamentList
      tournaments={tournaments}
      loading={loading}
      onAdd={addTournament}
      onArchive={archiveTournament}
      onDelete={deleteTournament}
    />
  )
}
