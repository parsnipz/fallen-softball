import { useState } from 'react'
import { useTournaments } from '../hooks/useTournaments'
import { useParks } from '../hooks/useParks'
import TournamentList from '../components/tournaments/TournamentList'
import TournamentCalendar from '../components/tournaments/TournamentCalendar'

export default function TournamentsPage() {
  const { tournaments, loading, error, addTournament, archiveTournament, deleteTournament } = useTournaments()
  const { parks } = useParks()
  const [view, setView] = useState('list') // 'list' or 'calendar'

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        Error loading tournaments: {error}
      </div>
    )
  }

  return (
    <div>
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
              view === 'list'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-b border-r ${
              view === 'calendar'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <TournamentList
          tournaments={tournaments}
          loading={loading}
          parks={parks}
          onAdd={addTournament}
          onArchive={archiveTournament}
          onDelete={deleteTournament}
        />
      ) : (
        <TournamentCalendar tournaments={tournaments} />
      )}
    </div>
  )
}
