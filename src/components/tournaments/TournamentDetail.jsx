import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, getStatusColor } from '../../lib/utils'
import { exportRosterPDF } from '../../lib/pdfExport'
import InvitationManager from './InvitationManager'
import StatusToggle from './StatusToggle'
import MessageThreadCreator from '../messaging/MessageThreadCreator'
import DocumentUpload from '../messaging/DocumentUpload'

export default function TournamentDetail({
  tournament,
  invitations,
  documents,
  lodgingOptions = [],
  loading,
  players,
  onInvitePlayer,
  onUpdateStatus,
  onUpdatePaid,
  onUpdateLodging,
  onRemoveInvitation,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onAddLodging,
  onUpdateLodgingOption,
  onDeleteLodging,
}) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [customDivisor, setCustomDivisor] = useState('')
  const [copiedSignatureLink, setCopiedSignatureLink] = useState(null)
  const [copiedAllLinks, setCopiedAllLinks] = useState(false)
  const [showAddLodging, setShowAddLodging] = useState(false)
  const [newLodging, setNewLodging] = useState({ name: '', url: '', capacity: '', total_cost: '', venmo_link: '' })
  const [copiedLodgingPayment, setCopiedLodgingPayment] = useState(null)

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

  // Calculate paid/unpaid players (only for "in" status)
  const paymentStatus = useMemo(() => {
    const inPlayers = invitations.filter(inv => inv.status === 'in')
    const paid = inPlayers.filter(inv => inv.paid)
    const unpaid = inPlayers.filter(inv => !inv.paid)
    return { paid, unpaid }
  }, [invitations])

  // Group players by status and gender
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

  // Calculate cost per player (rounded up to nearest dollar)
  const divisor = customDivisor ? parseInt(customDivisor) : statusCounts.in
  const costPerPlayer = useMemo(() => {
    if (!tournament?.total_cost || divisor === 0) return null
    return Math.ceil(parseFloat(tournament.total_cost) / divisor)
  }, [tournament?.total_cost, divisor])

  // Calculate total paid and amount due
  const paymentTotals = useMemo(() => {
    if (!costPerPlayer) return { totalPaid: 0, amountDue: 0 }
    const totalPaid = paymentStatus.paid.length * costPerPlayer
    const amountDue = paymentStatus.unpaid.length * costPerPlayer
    return { totalPaid, amountDue }
  }, [costPerPlayer, paymentStatus])

  // Calculate lodging stats per option
  const lodgingStats = useMemo(() => {
    const stats = {}
    lodgingOptions.forEach(opt => {
      const lodgingInvitations = invitations.filter(inv => inv.lodging_id === opt.id && inv.lodging_status === 'in')
      const totalPeople = lodgingInvitations.reduce((sum, inv) => sum + (inv.lodging_adults || 1) + (inv.lodging_kids || 0), 0)
      const paidInvitations = lodgingInvitations.filter(inv => inv.lodging_paid)
      const unpaidInvitations = lodgingInvitations.filter(inv => !inv.lodging_paid)
      const costPerPerson = opt.total_cost && totalPeople > 0 ? Math.ceil(parseFloat(opt.total_cost) / totalPeople) : null
      stats[opt.id] = {
        count: lodgingInvitations.length,
        totalPeople,
        paid: paidInvitations,
        unpaid: unpaidInvitations,
        costPerPerson,
        totalPaid: costPerPerson ? paidInvitations.reduce((sum, inv) => sum + ((inv.lodging_adults || 1) + (inv.lodging_kids || 0)) * costPerPerson, 0) : 0,
        amountDue: costPerPerson ? unpaidInvitations.reduce((sum, inv) => sum + ((inv.lodging_adults || 1) + (inv.lodging_kids || 0)) * costPerPerson, 0) : 0,
      }
    })
    return stats
  }, [invitations, lodgingOptions])

  // Copy payment info to clipboard
  const handleCopyPaymentInfo = () => {
    if (!costPerPlayer || !tournament?.venmo_link) return
    const message = `$${costPerPlayer} per player, Venmo: ${tournament.venmo_link}`
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Helper to render player names with gender grouping
  const renderPlayerNames = (genderGroups, isCoed) => {
    const formatName = (inv) => `${inv.player?.first_name} ${inv.player?.last_name}`

    if (isCoed) {
      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
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

    // For mens tournaments, just list all
    const allPlayers = [...genderGroups.males, ...genderGroups.females, ...genderGroups.unknown]
    return (
      <div className="text-xs text-gray-700">
        {allPlayers.map(formatName).join(', ')}
      </div>
    )
  }

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

  const handleExportRoster = async () => {
    const inPlayers = invitations.filter(inv => inv.status === 'in')

    if (inPlayers.length === 0) {
      alert('No players are marked as "In" to export')
      return
    }

    await exportRosterPDF(tournament, invitations)
  }

  // Signature link helpers
  const baseUrl = window.location.origin
  const getSignatureLink = (inv) => `${baseUrl}/sign/${inv.signature_token}`

  const handleCopySignatureLink = async (inv) => {
    try {
      await navigator.clipboard.writeText(getSignatureLink(inv))
      setCopiedSignatureLink(inv.id)
      setTimeout(() => setCopiedSignatureLink(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopyAllSignatureLinks = async () => {
    const unsignedInPlayers = invitations.filter(inv => inv.status === 'in' && !inv.signature_url)
    if (unsignedInPlayers.length === 0) return

    const links = unsignedInPlayers.map(inv => {
      const name = `${inv.player?.first_name} ${inv.player?.last_name}`
      return `${name}: ${getSignatureLink(inv)}`
    }).join('\n')

    const message = `${tournament.name} - Signature Links:\n\n${links}`

    try {
      await navigator.clipboard.writeText(message)
      setCopiedAllLinks(true)
      setTimeout(() => setCopiedAllLinks(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Lodging handlers
  const handleAddLodging = async () => {
    if (!newLodging.name.trim()) return
    await onAddLodging({
      name: newLodging.name.trim(),
      url: newLodging.url.trim() || null,
      capacity: newLodging.capacity ? parseInt(newLodging.capacity) : 0,
      total_cost: newLodging.total_cost ? parseFloat(newLodging.total_cost) : null,
      venmo_link: newLodging.venmo_link.trim() || null
    })
    setNewLodging({ name: '', url: '', capacity: '', total_cost: '', venmo_link: '' })
    setShowAddLodging(false)
  }

  const handleCopyLodgingPayment = (option) => {
    const stats = lodgingStats[option.id]
    if (!stats?.costPerPerson || !option.venmo_link) return
    const message = `$${stats.costPerPerson} per person for lodging, Venmo: ${option.venmo_link}`
    navigator.clipboard.writeText(message).then(() => {
      setCopiedLodgingPayment(option.id)
      setTimeout(() => setCopiedLodgingPayment(null), 2000)
    })
  }

  const handleLodgingStatusChange = (invitation, newStatus) => {
    if (newStatus === 'in') {
      // Default to first lodging option if available
      const defaultLodgingId = lodgingOptions.length > 0 ? lodgingOptions[0].id : null
      onUpdateLodging(invitation.id, {
        lodging_status: 'in',
        lodging_id: defaultLodgingId,
        lodging_adults: 1,
        lodging_kids: 0
      })
    } else {
      onUpdateLodging(invitation.id, {
        lodging_status: newStatus === 'out' ? 'out' : null,
        lodging_id: null,
        lodging_adults: 1,
        lodging_kids: 0
      })
    }
  }

  // Count unsigned "in" players
  const unsignedCount = invitations.filter(inv => inv.status === 'in' && !inv.signature_url).length
  const hasLodgingOptions = lodgingOptions.length > 0

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
              Export Roster PDF
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-center mb-2">
            <div className="text-2xl font-bold text-green-700">{statusCounts.in}</div>
            <div className="text-sm text-green-600">In</div>
          </div>
          {statusCounts.in > 0 && renderPlayerNames(playersByStatus.in, tournament.type === 'coed')}
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-center mb-2">
            <div className="text-2xl font-bold text-yellow-700">{statusCounts.pending}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          {statusCounts.pending > 0 && renderPlayerNames(playersByStatus.pending, tournament.type === 'coed')}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-center mb-2">
            <div className="text-2xl font-bold text-red-700">{statusCounts.out}</div>
            <div className="text-sm text-red-600">Out</div>
          </div>
          {statusCounts.out > 0 && renderPlayerNames(playersByStatus.out, tournament.type === 'coed')}
        </div>
      </div>

      {/* Cost & Payment Info */}
      {(tournament.total_cost || tournament.venmo_link) && (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost & Payment</h2>
          <div className="flex flex-wrap items-center gap-6">
            {tournament.total_cost && (
              <div>
                <div className="text-sm text-gray-500">Total Cost</div>
                <div className="text-xl font-bold text-gray-900">${parseFloat(tournament.total_cost).toFixed(2)}</div>
              </div>
            )}
            {tournament.total_cost && (
              <div>
                <div className="text-sm text-gray-500">Divide By</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customDivisor}
                    onChange={(e) => setCustomDivisor(e.target.value)}
                    placeholder={statusCounts.in.toString()}
                    min="1"
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-xs text-gray-500">
                    {customDivisor ? '(custom)' : `(${statusCounts.in} in)`}
                  </span>
                </div>
              </div>
            )}
            {costPerPlayer && (
              <div>
                <div className="text-sm text-gray-500">Cost Per Player</div>
                <div className="text-xl font-bold text-green-600">${costPerPlayer}</div>
              </div>
            )}
            {tournament.venmo_link && (
              <div className="flex-1">
                <div className="text-sm text-gray-500">Venmo Link</div>
                <a
                  href={tournament.venmo_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm break-all"
                >
                  {tournament.venmo_link}
                </a>
              </div>
            )}
          </div>
          {costPerPlayer && tournament.venmo_link && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={handleCopyPaymentInfo}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  copied
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Payment Message'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Copies: "${costPerPlayer} per player, Venmo: {tournament.venmo_link}"
              </p>
            </div>
          )}
          {/* Payment Totals */}
          {costPerPlayer && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Total Paid</div>
                  <div className="text-lg font-bold text-green-600">${paymentTotals.totalPaid}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Amount Due</div>
                  <div className="text-lg font-bold text-red-600">${paymentTotals.amountDue}</div>
                </div>
              </div>
            </div>
          )}
          {/* Payment Status Summary */}
          {statusCounts.in > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-lg font-bold text-green-700">{paymentStatus.paid.length}</div>
                    <div className="text-sm text-green-600">Paid</div>
                  </div>
                  {paymentStatus.paid.length > 0 && (
                    <div className="text-xs text-green-700">
                      {paymentStatus.paid.map(inv => `${inv.player?.first_name} ${inv.player?.last_name}`).join(', ')}
                    </div>
                  )}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-lg font-bold text-red-700">{paymentStatus.unpaid.length}</div>
                    <div className="text-sm text-red-600">Unpaid</div>
                  </div>
                  {paymentStatus.unpaid.length > 0 && (
                    <div className="text-xs text-red-700">
                      {paymentStatus.unpaid.map(inv => `${inv.player?.first_name} ${inv.player?.last_name}`).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lodging */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Lodging</h2>
          <button
            onClick={() => setShowAddLodging(!showAddLodging)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAddLodging ? 'Cancel' : '+ Add Option'}
          </button>
        </div>

        {showAddLodging && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              <input
                type="text"
                placeholder="Name (e.g., Airbnb #1)"
                value={newLodging.name}
                onChange={(e) => setNewLodging(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="url"
                placeholder="URL (optional)"
                value={newLodging.url}
                onChange={(e) => setNewLodging(prev => ({ ...prev, url: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                placeholder="Capacity"
                value={newLodging.capacity}
                onChange={(e) => setNewLodging(prev => ({ ...prev, capacity: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="0"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Total Cost ($)"
                value={newLodging.total_cost}
                onChange={(e) => setNewLodging(prev => ({ ...prev, total_cost: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="0"
                step="0.01"
              />
              <input
                type="url"
                placeholder="Venmo Link"
                value={newLodging.venmo_link}
                onChange={(e) => setNewLodging(prev => ({ ...prev, venmo_link: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                onClick={handleAddLodging}
                disabled={!newLodging.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {lodgingOptions.length === 0 ? (
          <p className="text-sm text-gray-500">No lodging options added yet.</p>
        ) : (
          <div className="space-y-4">
            {lodgingOptions.map(option => {
              const stats = lodgingStats[option.id] || { count: 0, totalPeople: 0, paid: [], unpaid: [], costPerPerson: null }
              return (
                <div key={option.id} className="bg-gray-50 rounded-lg p-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{option.name}</span>
                      {option.url ? (
                        <a
                          href={option.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Link
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No link</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {stats.totalPeople} / {option.capacity || '∞'} people
                      </span>
                      <button
                        onClick={() => onDeleteLodging(option.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Cost info */}
                  {option.total_cost && (
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total: </span>
                          <span className="font-medium">${parseFloat(option.total_cost).toFixed(2)}</span>
                        </div>
                        {stats.costPerPerson && (
                          <div>
                            <span className="text-gray-500">Per Person: </span>
                            <span className="font-medium text-green-600">${stats.costPerPerson}</span>
                          </div>
                        )}
                        {option.venmo_link && (
                          <a
                            href={option.venmo_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Venmo
                          </a>
                        )}
                        {stats.costPerPerson && option.venmo_link && (
                          <button
                            onClick={() => handleCopyLodgingPayment(option)}
                            className={`text-xs px-2 py-1 rounded ${
                              copiedLodgingPayment === option.id
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {copiedLodgingPayment === option.id ? 'Copied!' : 'Copy Payment'}
                          </button>
                        )}
                      </div>

                      {/* Payment totals */}
                      {stats.costPerPerson && (
                        <div className="flex gap-4 mt-2 text-xs">
                          <div>
                            <span className="text-gray-500">Paid: </span>
                            <span className="font-medium text-green-600">${stats.totalPaid}</span>
                            <span className="text-gray-400"> ({stats.paid.length})</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Due: </span>
                            <span className="font-medium text-red-600">${stats.amountDue}</span>
                            <span className="text-gray-400"> ({stats.unpaid.length})</span>
                          </div>
                        </div>
                      )}

                      {/* Paid/Unpaid names */}
                      {stats.costPerPerson && stats.count > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {stats.paid.length > 0 && (
                            <div className="text-xs text-green-700">
                              <span className="font-medium">Paid: </span>
                              {stats.paid.map(inv => `${inv.player?.first_name} ${inv.player?.last_name}`).join(', ')}
                            </div>
                          )}
                          {stats.unpaid.length > 0 && (
                            <div className="text-xs text-red-700">
                              <span className="font-medium">Unpaid: </span>
                              {stats.unpaid.map(inv => `${inv.player?.first_name} ${inv.player?.last_name}`).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
          onUpdate={onUpdateDocument}
          onDelete={onDeleteDocument}
        />
      </div>

      {/* Invited Players - Compact View */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Invited Players ({invitations.length})
          </h2>
          {unsignedCount > 0 && (
            <button
              onClick={handleCopyAllSignatureLinks}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                copiedAllLinks
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {copiedAllLinks ? 'Copied!' : `Copy ${unsignedCount} Signature Links`}
            </button>
          )}
        </div>

        {sortedInvitations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No players invited yet. Click "Invite Players" to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-sm"
              >
                {/* Status Badge */}
                <span
                  className={`px-1.5 py-0.5 text-xs font-medium rounded capitalize ${getStatusColor(invitation.status)}`}
                >
                  {invitation.status}
                </span>

                {/* Player Name */}
                <span className="font-medium text-gray-900 min-w-[120px]">
                  {invitation.player?.first_name} {invitation.player?.last_name}
                </span>

                {/* Signature Status (only for "in" players) */}
                {invitation.status === 'in' && (
                  invitation.signature_url ? (
                    <span className="text-xs text-green-600">✓ Signed</span>
                  ) : (
                    <button
                      onClick={() => handleCopySignatureLink(invitation)}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        copiedSignatureLink === invitation.id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                    >
                      {copiedSignatureLink === invitation.id ? 'Copied!' : 'Sign'}
                    </button>
                  )
                )}

                {/* Paid Checkbox (only for "in" players with cost) */}
                {invitation.status === 'in' && tournament.total_cost && (
                  <label className="flex items-center gap-1 cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={invitation.paid || false}
                      onChange={(e) => onUpdatePaid(invitation.id, e.target.checked)}
                      className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className={`text-xs ${invitation.paid ? 'text-green-600' : 'text-gray-400'}`}>
                      Paid
                    </span>
                  </label>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Lodging (only for "in" players, far right) */}
                {invitation.status === 'in' && (
                  <div className="flex items-center gap-2 mr-2">
                    {/* Lodging In/Out Toggle */}
                    <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                      <button
                        onClick={() => handleLodgingStatusChange(invitation, 'in')}
                        disabled={!hasLodgingOptions}
                        className={`px-2 py-0.5 text-xs ${
                          invitation.lodging_status === 'in'
                            ? 'bg-green-500 text-white'
                            : hasLodgingOptions
                              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        🏠 In
                      </button>
                      <button
                        onClick={() => handleLodgingStatusChange(invitation, 'out')}
                        className={`px-2 py-0.5 text-xs ${
                          invitation.lodging_status === 'out'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Out
                      </button>
                    </div>

                    {/* Lodging Details (only show when lodging_status is 'in') */}
                    {invitation.lodging_status === 'in' && (
                      <>
                        {/* Lodging Option Selector */}
                        {lodgingOptions.length > 1 && (
                          <select
                            value={invitation.lodging_id || ''}
                            onChange={(e) => onUpdateLodging(invitation.id, { lodging_id: e.target.value || null })}
                            className="text-xs border border-gray-200 rounded px-1 py-0.5"
                          >
                            {lodgingOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                          </select>
                        )}

                        {/* Adults Count */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">A:</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={invitation.lodging_adults || 1}
                            onChange={(e) => onUpdateLodging(invitation.id, { lodging_adults: parseInt(e.target.value) || 1 })}
                            className="w-10 text-xs border border-gray-200 rounded px-1 py-0.5 text-center"
                          />
                        </div>

                        {/* Kids Count */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">K:</span>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={invitation.lodging_kids || 0}
                            onChange={(e) => onUpdateLodging(invitation.id, { lodging_kids: parseInt(e.target.value) || 0 })}
                            className="w-10 text-xs border border-gray-200 rounded px-1 py-0.5 text-center"
                          />
                        </div>

                        {/* Lodging Paid Checkbox (only if lodging has cost) */}
                        {(() => {
                          const lodgingOpt = lodgingOptions.find(o => o.id === invitation.lodging_id)
                          if (!lodgingOpt?.total_cost) return null
                          return (
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={invitation.lodging_paid || false}
                                onChange={(e) => onUpdateLodging(invitation.id, { lodging_paid: e.target.checked })}
                                className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className={`text-xs ${invitation.lodging_paid ? 'text-green-600' : 'text-gray-400'}`}>
                                $
                              </span>
                            </label>
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* Status Toggle */}
                <StatusToggle
                  status={invitation.status}
                  onChange={(status) => onUpdateStatus(invitation.id, status)}
                />

                {/* Remove Button */}
                <button
                  onClick={() => onRemoveInvitation(invitation.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
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
