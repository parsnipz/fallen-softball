import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, getStatusColor, createTournamentSlug } from '../../lib/utils'
import { exportRosterPDF } from '../../lib/pdfExport'
import { exportAFAForm } from '../../lib/afaFormExport'
import { createCalibrationPDF } from '../../lib/afaCalibration'
import InvitationManager from './InvitationManager'
import StatusToggle from './StatusToggle'
import MessageThreadCreator from '../messaging/MessageThreadCreator'
import DocumentUpload from '../messaging/DocumentUpload'
import AddressAutocomplete from '../common/AddressAutocomplete'

export default function TournamentDetail({
  tournament,
  invitations,
  documents,
  lodgingOptions = [],
  loading,
  players,
  parks = [],
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
  onUploadImage,
  onUpdateTournament,
  onAddTournamentPark,
  onRemoveTournamentPark,
}) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    type: 'coed',
    date: '',
    location: '',
    total_cost: '',
    additional_fees: '',
    venmo_link: '',
  })
  const [copied, setCopied] = useState(false)
  const [customDivisor, setCustomDivisor] = useState('')
  const [divisorInitialized, setDivisorInitialized] = useState(false)
  const [copiedSignatureLink, setCopiedSignatureLink] = useState(null)
  const [copiedAllLinks, setCopiedAllLinks] = useState(false)
  const [showAddLodging, setShowAddLodging] = useState(false)
  const [newLodging, setNewLodging] = useState({ name: '', url: '', capacity: '', total_cost: '', additional_fees: '', venmo_link: '', address: '', maps_url: '' })
  const [editingLodging, setEditingLodging] = useState(null)
  const [copiedLodgingPayment, setCopiedLodgingPayment] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [copiedShareLink, setCopiedShareLink] = useState(false)

  // Collapsible panel states
  const [expandedPanels, setExpandedPanels] = useState({
    status: true,
    payment: true,
    lodging: true,
    messaging: false,
    documents: false,
    players: true,
  })

  const togglePanel = (panel) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }))
  }

  // Initialize customDivisor from saved tournament.cost_divisor
  useEffect(() => {
    if (tournament?.cost_divisor && !divisorInitialized) {
      setCustomDivisor(tournament.cost_divisor.toString())
      setDivisorInitialized(true)
    }
  }, [tournament?.cost_divisor, divisorInitialized])

  // Save divisor when it changes (on blur)
  const handleDivisorBlur = () => {
    const value = customDivisor ? parseInt(customDivisor) : null
    if (value !== tournament?.cost_divisor) {
      onUpdateTournament({ cost_divisor: value })
    }
  }

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
  // Includes additional_fees in the total before dividing
  const divisor = customDivisor ? parseInt(customDivisor) : statusCounts.in
  const costPerPlayer = useMemo(() => {
    if (!tournament?.total_cost || divisor === 0) return null
    const total = parseFloat(tournament.total_cost) + parseFloat(tournament.additional_fees || 0)
    return Math.ceil(total / divisor)
  }, [tournament?.total_cost, tournament?.additional_fees, divisor])

  // Calculate total paid and amount due
  const paymentTotals = useMemo(() => {
    if (!costPerPlayer) return { totalPaid: 0, amountDue: 0 }
    const totalPaid = paymentStatus.paid.length * costPerPlayer
    const amountDue = paymentStatus.unpaid.length * costPerPlayer
    return { totalPaid, amountDue }
  }, [costPerPlayer, paymentStatus])

  // Calculate lodging stats per option
  // Includes additional_fees in the total before dividing
  const lodgingStats = useMemo(() => {
    const stats = {}
    lodgingOptions.forEach(opt => {
      const lodgingInvitations = invitations.filter(inv => inv.lodging_id === opt.id && inv.lodging_status === 'in')
      const totalPeople = lodgingInvitations.reduce((sum, inv) => sum + (inv.lodging_adults || 1) + (inv.lodging_kids || 0), 0)
      const paidInvitations = lodgingInvitations.filter(inv => inv.lodging_paid)
      const unpaidInvitations = lodgingInvitations.filter(inv => !inv.lodging_paid)
      const totalWithFees = (parseFloat(opt.total_cost) || 0) + (parseFloat(opt.additional_fees) || 0)
      const costPerPerson = totalWithFees && totalPeople > 0 ? Math.ceil(totalWithFees / totalPeople) : null
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

  const handleExportAFAForm = async () => {
    const inPlayers = invitations.filter(inv => inv.status === 'in')

    if (inPlayers.length === 0) {
      alert('No players are marked as "In" to export')
      return
    }

    await exportAFAForm(tournament, invitations)
  }

  const handleCalibration = async () => {
    await createCalibrationPDF()
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      await onUploadImage(file)
    } catch (err) {
      console.error('Error uploading image:', err)
    } finally {
      setUploadingImage(false)
    }
  }

  // Edit tournament handlers
  const handleOpenEditModal = () => {
    setEditFormData({
      name: tournament.name || '',
      type: tournament.type || 'coed',
      date: tournament.date || '',
      location: tournament.location || '',
      total_cost: tournament.total_cost || '',
      additional_fees: tournament.additional_fees || '',
      venmo_link: tournament.venmo_link || '',
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    await onUpdateTournament({
      name: editFormData.name,
      type: editFormData.type,
      date: editFormData.date,
      location: editFormData.location,
      total_cost: editFormData.total_cost || null,
      additional_fees: editFormData.additional_fees || null,
      venmo_link: editFormData.venmo_link || null,
    })
    setShowEditModal(false)
  }

  const handleAddPark = async (parkId) => {
    if (!parkId) return
    await onAddTournamentPark(parkId)
  }

  const handleRemovePark = async (parkId) => {
    await onRemoveTournamentPark(parkId)
  }

  // Get parks that aren't already added to this tournament
  const availableParks = parks.filter(
    park => !(tournament?.parks || []).find(tp => tp.id === park.id)
  )

  // Share link for player view
  const getPlayerViewLink = () => {
    const slug = createTournamentSlug(tournament?.name, tournament?.id)
    return `${window.location.origin}/t/${slug}`
  }

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(getPlayerViewLink())
      setCopiedShareLink(true)
      setTimeout(() => setCopiedShareLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
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
      additional_fees: newLodging.additional_fees ? parseFloat(newLodging.additional_fees) : null,
      venmo_link: newLodging.venmo_link.trim() || null,
      address: newLodging.address.trim() || null,
      maps_url: newLodging.maps_url.trim() || null
    })
    setNewLodging({ name: '', url: '', capacity: '', total_cost: '', additional_fees: '', venmo_link: '', address: '', maps_url: '' })
    setShowAddLodging(false)
  }

  const handleOpenEditLodging = (option) => {
    setEditingLodging({
      id: option.id,
      name: option.name || '',
      url: option.url || '',
      capacity: option.capacity || '',
      total_cost: option.total_cost || '',
      additional_fees: option.additional_fees || '',
      venmo_link: option.venmo_link || '',
      address: option.address || '',
      maps_url: option.maps_url || ''
    })
  }

  const handleSaveEditLodging = async () => {
    if (!editingLodging?.name.trim()) return
    await onUpdateLodgingOption(editingLodging.id, {
      name: editingLodging.name.trim(),
      url: editingLodging.url.trim() || null,
      capacity: editingLodging.capacity ? parseInt(editingLodging.capacity) : 0,
      total_cost: editingLodging.total_cost ? parseFloat(editingLodging.total_cost) : null,
      additional_fees: editingLodging.additional_fees ? parseFloat(editingLodging.additional_fees) : null,
      venmo_link: editingLodging.venmo_link.trim() || null,
      address: editingLodging.address.trim() || null,
      maps_url: editingLodging.maps_url.trim() || null
    })
    setEditingLodging(null)
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
            {tournament.parks && tournament.parks.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {tournament.parks.map((park) => (
                  <span key={park.id} className="text-gray-500">
                    {park.maps_url ? (
                      <a
                        href={park.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {park.name}
                      </a>
                    ) : (
                      <span>{park.name}</span>
                    )}
                    {park.city && park.state && (
                      <span className="text-gray-400"> ({park.city}, {park.state})</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyShareLink}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                copiedShareLink
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {copiedShareLink ? 'Link Copied!' : 'Share'}
            </button>
            <button
              onClick={handleOpenEditModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              onClick={handleExportAFAForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              AFA Form
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

      {/* Tournament Image */}
      <div className="mb-6 flex justify-center">
        {tournament.image_url ? (
          <div className="relative w-1/2">
            <img
              src={tournament.image_url}
              alt={tournament.name}
              className="w-full rounded-lg"
            />
            <label className="absolute bottom-2 right-2 px-3 py-1 text-sm bg-white/90 rounded-md cursor-pointer hover:bg-white">
              Change Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
            </label>
          </div>
        ) : (
          <label className="flex items-center justify-center w-1/2 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 bg-gray-50">
            <div className="text-center">
              <span className="text-gray-500">
                {uploadingImage ? 'Uploading...' : 'Click to add tournament image'}
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImage}
            />
          </label>
        )}
      </div>

      {/* Status Summary */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <button
          onClick={() => togglePanel('status')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Status Summary
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({statusCounts.in} in, {statusCounts.pending} pending, {statusCounts.out} out)
            </span>
          </h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expandedPanels.status ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedPanels.status && (
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
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
          </div>
        )}
      </div>

      {/* Cost & Payment Info */}
      {(tournament.total_cost || tournament.venmo_link) && (
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <button
            onClick={() => togglePanel('payment')}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Cost & Payment
              {costPerPlayer && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (${costPerPlayer}/player)
                </span>
              )}
            </h2>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedPanels.payment ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedPanels.payment && (
          <div className="p-4">
          <div className="flex flex-wrap items-center gap-6">
            {tournament.total_cost && (
              <div>
                <div className="text-sm text-gray-500">Total Cost</div>
                <div className="text-xl font-bold text-gray-900">
                  ${parseFloat(tournament.total_cost).toFixed(2)}
                  {tournament.additional_fees && (
                    <span className="text-sm font-normal text-gray-500">
                      {' '}+ ${parseFloat(tournament.additional_fees).toFixed(2)} fees
                    </span>
                  )}
                </div>
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
                    onBlur={handleDivisorBlur}
                    placeholder={statusCounts.in.toString()}
                    min="1"
                    className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-xs text-gray-500">
                    {customDivisor ? '(saved)' : `(${statusCounts.in} in)`}
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
        </div>
      )}

      {/* Lodging */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <button
          onClick={() => togglePanel('lodging')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Lodging
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({lodgingOptions.length} option{lodgingOptions.length !== 1 ? 's' : ''})
            </span>
          </h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expandedPanels.lodging ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedPanels.lodging && (
        <div className="p-4">
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setShowAddLodging(!showAddLodging)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAddLodging ? 'Cancel' : '+ Add Option'}
          </button>
        </div>

        {showAddLodging && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Name (e.g., Airbnb #1) *"
                value={newLodging.name}
                onChange={(e) => setNewLodging(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="url"
                placeholder="Listing URL"
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
            <div className="grid grid-cols-2 gap-2">
              <AddressAutocomplete
                value={newLodging.address}
                onChange={(val) => setNewLodging(prev => ({
                  ...prev,
                  address: val,
                  maps_url: val ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}` : ''
                }))}
                placeholder="Search address..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="url"
                placeholder="Google Maps URL (auto-filled)"
                value={newLodging.maps_url}
                onChange={(e) => setNewLodging(prev => ({ ...prev, maps_url: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                type="number"
                placeholder="Add'l Fees ($)"
                value={newLodging.additional_fees}
                onChange={(e) => setNewLodging(prev => ({ ...prev, additional_fees: e.target.value }))}
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
                      {option.url && (
                        <a
                          href={option.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Listing
                        </a>
                      )}
                      {option.maps_url && (
                        <a
                          href={option.maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Directions
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {stats.totalPeople} / {option.capacity || '∞'} people
                      </span>
                      <button
                        onClick={() => handleOpenEditLodging(option)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteLodging(option.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Address */}
                  {option.address && (
                    <div className="text-xs text-gray-500 mb-2">{option.address}</div>
                  )}

                  {/* Cost info */}
                  {(option.total_cost || option.additional_fees) && (
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total: </span>
                          <span className="font-medium">
                            ${parseFloat(option.total_cost || 0).toFixed(2)}
                            {option.additional_fees && (
                              <span className="text-gray-500 font-normal">
                                {' '}+ ${parseFloat(option.additional_fees).toFixed(2)} fees
                              </span>
                            )}
                          </span>
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
        )}
      </div>

      {/* Messaging */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <button
          onClick={() => togglePanel('messaging')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Messaging</h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expandedPanels.messaging ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedPanels.messaging && (
        <div className="p-4">
          <MessageThreadCreator invitations={invitations} />
        </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
        <button
          onClick={() => togglePanel('documents')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Documents
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({documents.length})
            </span>
          </h2>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expandedPanels.documents ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expandedPanels.documents && (
        <div className="p-4">
          <DocumentUpload
            tournamentId={tournament.id}
            documents={documents}
            onAdd={onAddDocument}
            onUpdate={onUpdateDocument}
            onDelete={onDeleteDocument}
          />
        </div>
        )}
      </div>

      {/* Invited Players - Compact View */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => togglePanel('players')}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Invited Players ({invitations.length})
          </h2>
          <div className="flex items-center gap-2">
            {unsignedCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyAllSignatureLinks()
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  copiedAllLinks
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {copiedAllLinks ? 'Copied!' : `Copy ${unsignedCount} Signature Links`}
              </button>
            )}
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expandedPanels.players ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {expandedPanels.players && (
        <>
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
        </>
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

      {/* Edit Lodging Modal */}
      {editingLodging && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Lodging</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={editingLodging.name}
                  onChange={(e) => setEditingLodging({ ...editingLodging, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Listing URL</label>
                  <input
                    type="url"
                    value={editingLodging.url}
                    onChange={(e) => setEditingLodging({ ...editingLodging, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={editingLodging.capacity}
                    onChange={(e) => setEditingLodging({ ...editingLodging, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <AddressAutocomplete
                  value={editingLodging.address}
                  onChange={(val) => setEditingLodging(prev => ({
                    ...prev,
                    address: val,
                    maps_url: val ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}` : prev.maps_url
                  }))}
                  placeholder="Search address..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL</label>
                <input
                  type="url"
                  value={editingLodging.maps_url}
                  onChange={(e) => setEditingLodging({ ...editingLodging, maps_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Auto-filled from address"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost ($)</label>
                  <input
                    type="number"
                    value={editingLodging.total_cost}
                    onChange={(e) => setEditingLodging({ ...editingLodging, total_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add'l Fees ($)</label>
                  <input
                    type="number"
                    value={editingLodging.additional_fees}
                    onChange={(e) => setEditingLodging({ ...editingLodging, additional_fees: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venmo Link</label>
                  <input
                    type="url"
                    value={editingLodging.venmo_link}
                    onChange={(e) => setEditingLodging({ ...editingLodging, venmo_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setEditingLodging(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditLodging}
                  disabled={!editingLodging.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tournament Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Tournament</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="coed">Coed</option>
                    <option value="mens">Mens</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Cost ($)
                  </label>
                  <input
                    type="number"
                    value={editFormData.total_cost}
                    onChange={(e) => setEditFormData({ ...editFormData, total_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add'l Fees ($)
                  </label>
                  <input
                    type="number"
                    value={editFormData.additional_fees}
                    onChange={(e) => setEditFormData({ ...editFormData, additional_fees: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venmo Link
                  </label>
                  <input
                    type="url"
                    value={editFormData.venmo_link}
                    onChange={(e) => setEditFormData({ ...editFormData, venmo_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://venmo.com/..."
                  />
                </div>
              </div>

              {/* Parks Management */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parks
                </label>

                {/* Current Parks */}
                {tournament.parks && tournament.parks.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {tournament.parks.map((park) => (
                      <div
                        key={park.id}
                        className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm text-gray-900">{park.name}</span>
                          {park.city && park.state && (
                            <span className="text-xs text-gray-500">({park.city}, {park.state})</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemovePark(park.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Park */}
                {availableParks.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      id="add-park-select"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      defaultValue=""
                    >
                      <option value="">Select a park to add...</option>
                      {availableParks.map((park) => (
                        <option key={park.id} value={park.id}>
                          {park.name} {park.city && park.state ? `(${park.city}, ${park.state})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById('add-park-select')
                        handleAddPark(select.value)
                        select.value = ''
                      }}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {parks.length === 0
                      ? 'No parks available. Add parks in the Parks page first.'
                      : 'All parks have been added to this tournament.'}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editFormData.name || !editFormData.date}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
