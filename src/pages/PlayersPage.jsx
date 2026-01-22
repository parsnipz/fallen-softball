import { usePlayers } from '../hooks/usePlayers'
import PlayerList from '../components/players/PlayerList'

export default function PlayersPage() {
  const { players, loading, error, addPlayer, updatePlayer, deletePlayer } = usePlayers()

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        Error loading players: {error}
      </div>
    )
  }

  return (
    <PlayerList
      players={players}
      loading={loading}
      onAdd={addPlayer}
      onUpdate={updatePlayer}
      onDelete={deletePlayer}
    />
  )
}
