import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, extractIdFromSlug } from '../lib/utils'

export default function PlayerTournamentView() {
  const { slug } = useParams()
  const shortId = extractIdFromSlug(slug)
  const [tournament, setTournament] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [documents, setDocuments] = useState([])
  const [lodgingOptions, setLodgingOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchTournament() {
      try {
        setLoading(true)
        setError(null)

        // Fetch tournament with parks (lookup by short ID prefix)
        // Note: We fetch tournaments and filter by ID prefix since Supabase doesn't support LIKE on UUID
        const { data: tournamentsData, error: tournamentError } = await supabase
          .from('tournaments')
          .select(`
            *,
            park:parks(*),
            tournament_parks(
              park:parks(*)
            )
          `)

        if (tournamentError) throw tournamentError

        // Find tournament where ID starts with the short ID
        const tournamentData = tournamentsData?.find(t => t.id.startsWith(shortId))

        if (!tournamentData) {
          throw new Error('Tournament not found')
        }

        // Flatten parks from junction table
        if (tournamentData.tournament_parks) {
          tournamentData.parks = tournamentData.tournament_parks
            .map(tp => tp.park)
            .filter(Boolean)
          delete tournamentData.tournament_parks
        } else {
          tournamentData.parks = []
        }

        // Keep backward compatibility with single park
        if (tournamentData.park && !tournamentData.parks.find(p => p.id === tournamentData.park.id)) {
          tournamentData.parks.unshift(tournamentData.park)
        }

        const tournamentId = tournamentData.id

        // Fetch invitations with player details (excluding payment info)
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('tournament_invitations')
          .select(`
            id,
            status,
            lodging_status,
            lodging_id,
            lodging_adults,
            lodging_kids,
            player:players(id, first_name, last_name, gender)
          `)
          .eq('tournament_id', tournamentId)

        if (invitationsError) throw invitationsError

        // Fetch documents (excluding waiver documents)
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('created_at', { ascending: false })

        if (documentsError) throw documentsError

        // Fetch lodging options
        const { data: lodgingData, error: lodgingError } = await supabase
          .from('tournament_lodging')
          .select('id, name, url, capacity, total_cost, additional_fees, venmo_link')
          .eq('tournament_id', tournamentId)
          .order('created_at', { ascending: true })

        if (lodgingError) throw lodgingError

        setTournament(tournamentData)
        setInvitations(invitationsData || [])
        setDocuments(documentsData || [])
        setLodgingOptions(lodgingData || [])
      } catch (err) {
        setError(err.message)
        console.error('Error fetching tournament:', err)
      } finally {
        setLoading(false)
      }
    }

    if (shortId) {
      fetchTournament()
    }
  }, [shortId])

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

  // Group players by status
  const playersByStatus = useMemo(() => {
    const groupByGender = (invs) => {
      const females = invs.filter(inv => inv.player?.gender === 'F')
        .sort((a, b) => a.player?.last_name?.localeCompare(b.player?.last_name) || 0)
      const males = invs.filter(inv => inv.player?.gender === 'M')
        .sort((a, b) => a.player?.last_name?.localeCompare(b.player?.last_name) || 0)
      const unknown = invs.filter(inv => !inv.player?.gender || (inv.player?.gender !== 'F' && inv.player?.gender !== 'M'))
        .sort((a, b) => a.player?.last_name?.localeCompare(b.player?.last_name) || 0)
      return { females, males, unknown }
    }

    return {
      in: groupByGender(invitations.filter(inv => inv.status === 'in')),
      pending: groupByGender(invitations.filter(inv => inv.status === 'pending')),
      out: groupByGender(invitations.filter(inv => inv.status === 'out')),
    }
  }, [invitations])

  // Calculate cost per player
  // Calculate cost per player (includes additional_fees)
  const costPerPlayer = useMemo(() => {
    if (!tournament?.total_cost || statusCounts.in === 0) return null
    const total = parseFloat(tournament.total_cost) + parseFloat(tournament.additional_fees || 0)
    return Math.ceil(total / statusCounts.in)
  }, [tournament?.total_cost, tournament?.additional_fees, statusCounts.in])

  // Calculate lodging stats
  // Calculate lodging stats (includes additional_fees)
  const lodgingStats = useMemo(() => {
    const stats = {}
    lodgingOptions.forEach(opt => {
      const lodgingInvitations = invitations.filter(inv => inv.lodging_id === opt.id && inv.lodging_status === 'in')
      const totalPeople = lodgingInvitations.reduce((sum, inv) => sum + (inv.lodging_adults || 1) + (inv.lodging_kids || 0), 0)
      const totalWithFees = (parseFloat(opt.total_cost) || 0) + (parseFloat(opt.additional_fees) || 0)
      const costPerPerson = totalWithFees && totalPeople > 0 ? Math.ceil(totalWithFees / totalPeople) : null
      stats[opt.id] = {
        count: lodgingInvitations.length,
        totalPeople,
        costPerPerson,
        players: lodgingInvitations.map(inv => `${inv.player?.first_name} ${inv.player?.last_name}`)
      }
    })
    return stats
  }, [invitations, lodgingOptions])

  // Helper to render player names
  const renderPlayerNames = (genderGroups, isCoed) => {
    const formatName = (inv) => `${inv.player?.first_name} ${inv.player?.last_name}`

    if (isCoed) {
      return (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            {genderGroups.females.length > 0 && (
              <div className="text-pink-700">
                {genderGroups.females.map(formatName).join(', ')}
              </div>
            )}
          </div>
          <div>
            {genderGroups.males.length > 0 && (
              <div className="text-blue-700">
                {genderGroups.males.map(formatName).join(', ')}
              </div>
            )}
          </div>
          {genderGroups.unknown.length > 0 && (
            <div className="col-span-2 text-gray-600">
              {genderGroups.unknown.map(formatName).join(', ')}
            </div>
          )}
        </div>
      )
    }

    const allPlayers = [...genderGroups.males, ...genderGroups.females, ...genderGroups.unknown]
    return (
      <div className="text-sm text-gray-700">
        {allPlayers.map(formatName).join(', ')}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Tournament Not Found</h1>
          <p className="text-gray-500">This tournament may not exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {tournament.image_url && (
            <img
              src={tournament.image_url}
              alt={tournament.name}
              className="w-full object-cover"
            />
          )}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-2">
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
            </div>
            <p className="text-lg text-gray-600 mb-4">
              {formatDate(tournament.date)}
              {tournament.location && ` • ${tournament.location}`}
            </p>

            {/* Parks / Directions */}
            {tournament.parks && tournament.parks.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Location{tournament.parks.length > 1 ? 's' : ''}</h3>
                <div className="space-y-2">
                  {tournament.parks.map((park) => (
                    <div key={park.id} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <div className="font-medium text-gray-900">{park.name}</div>
                        {park.address && <div className="text-sm text-gray-500">{park.address}</div>}
                        {park.city && park.state && <div className="text-sm text-gray-500">{park.city}, {park.state}</div>}
                        {park.maps_url && (
                          <a
                            href={park.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Get Directions
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        {(costPerPlayer || tournament.venmo_link) && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="flex flex-wrap items-center gap-6">
              {costPerPlayer && (
                <div>
                  <div className="text-sm text-gray-500">Cost Per Player</div>
                  <div className="text-2xl font-bold text-green-600">${costPerPlayer}</div>
                </div>
              )}
              {tournament.venmo_link && (
                <a
                  href={tournament.venmo_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 3c.5.8.7 1.6.7 2.6 0 3.4-2.9 7.8-5.2 10.9H9.4L7 3.6l5-.5.9 9c.8-1.3 1.8-3.4 1.8-4.8 0-.9-.2-1.5-.4-2l5.2-1.3z"/>
                  </svg>
                  Pay with Venmo
                </a>
              )}
            </div>
          </div>
        )}

        {/* Lodging Options */}
        {lodgingOptions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lodging Options</h2>
            <div className="space-y-4">
              {lodgingOptions.map(option => {
                const stats = lodgingStats[option.id] || { count: 0, totalPeople: 0, costPerPerson: null, players: [] }
                return (
                  <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{option.name}</h3>
                        <div className="text-sm text-gray-500">
                          {stats.totalPeople} / {option.capacity || '∞'} people
                        </div>
                      </div>
                      {option.url && (
                        <a
                          href={option.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </a>
                      )}
                    </div>

                    {stats.costPerPerson && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                        <div>
                          <span className="text-sm text-gray-500">Cost per person: </span>
                          <span className="font-bold text-green-600">${stats.costPerPerson}</span>
                        </div>
                        {option.venmo_link && (
                          <a
                            href={option.venmo_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Pay Lodging
                          </a>
                        )}
                      </div>
                    )}

                    {stats.players.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500">Staying here:</div>
                        <div className="text-sm text-gray-700">{stats.players.join(', ')}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents & Flyers</h2>
            <div className="space-y-2">
              {documents.map(doc => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-900">{doc.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Player Status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Who's Playing</h2>
          <div className="space-y-4">
            {/* In */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xl font-bold text-green-700">{statusCounts.in}</div>
                <div className="text-sm font-medium text-green-600">In</div>
              </div>
              {statusCounts.in > 0 && renderPlayerNames(playersByStatus.in, tournament.type === 'coed')}
            </div>

            {/* Pending */}
            {statusCounts.pending > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xl font-bold text-yellow-700">{statusCounts.pending}</div>
                  <div className="text-sm font-medium text-yellow-600">Pending</div>
                </div>
                {renderPlayerNames(playersByStatus.pending, tournament.type === 'coed')}
              </div>
            )}

            {/* Out */}
            {statusCounts.out > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xl font-bold text-red-700">{statusCounts.out}</div>
                  <div className="text-sm font-medium text-red-600">Out</div>
                </div>
                {renderPlayerNames(playersByStatus.out, tournament.type === 'coed')}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          Fallen Softball
        </div>
      </div>
    </div>
  )
}
