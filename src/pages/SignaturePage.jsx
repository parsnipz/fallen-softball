import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import SignaturePad from '../components/signatures/SignaturePad'

// Default waiver text when no custom waiver is uploaded
function DefaultWaiverText() {
  return (
    <div className="text-sm text-gray-600">
      <ul className="space-y-2 list-none">
        <li>I, the undersigned, acting for myself (or as parent or guardian of the listed child or ward):</li>
        <li>(1) Hereby assume all risks of injury to me (or my child or ward) from property damage and/or personal injury, including but not limited to death, arising from or related in any way to:
          <ul className="ml-4 mt-1 space-y-1">
            <li>(a) My presence on, or use of (or the presence of my child or ward on, or use by my child or ward of), real or personal property owned or operated by the City of St. George, and/or</li>
            <li>(b) My participation (or the participation by my child or ward) at any time in the listed activities.</li>
          </ul>
        </li>
        <li>(2) Hereby waive all claims against the City of St. George, and its agents and employees, related to the above injuries, regardless of foreseeability, including but not limited to any claims related to injury caused in whole or in part by the negligence of the City of St. George or its agents or employees.</li>
        <li>(3) Hereby agree to indemnify and hold harmless the City of St. George, and its agents and employees from all such claims.</li>
        <li>(4) Grant permission for my photograph to be taken and used for lawful purposes, and I acknowledge that I shall have no further claim to the resulting images or their subsequent use, unless otherwise agreed in writing.</li>
        <li>I have read this release and waiver of liability for the American Fastpitch Association (AFA) and in consideration of being allowed to participate in any way in AFA related events and activities, the undersigned agree to not hold liable the association, directors, schools or parks where softball/baseball events are to take place.</li>
        <li>In case I am injured during practice/games on the premises I give up my right to file a claim(s) against AFA.</li>
        <li>I understand that I have given up substantial rights by signing this form and I have signed it freely and voluntarily.</li>
      </ul>
    </div>
  )
}

// Custom waiver document display
function CustomWaiverDocument({ waiver }) {
  if (waiver.file_type === 'pdf') {
    return (
      <div className="w-full">
        <iframe
          src={waiver.file_url}
          className="w-full h-[500px] border border-gray-200 rounded"
          title="Waiver Document"
        />
        <p className="text-xs text-gray-500 mt-2 text-center">
          Scroll to read the full document
        </p>
      </div>
    )
  }

  // Image waiver
  return (
    <div className="w-full">
      <img
        src={waiver.file_url}
        alt="Waiver Document"
        className="w-full border border-gray-200 rounded"
      />
    </div>
  )
}

export default function SignaturePage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [invitation, setInvitation] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [player, setPlayer] = useState(null)
  const [waiverDocument, setWaiverDocument] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchInvitation()
  }, [token])

  const fetchInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch invitation by token (this is a public query, no auth needed)
      const { data, error: fetchError } = await supabase
        .from('tournament_invitations')
        .select(`
          *,
          tournament:tournaments(*),
          player:players(*)
        `)
        .eq('signature_token', token)
        .single()

      if (fetchError) throw fetchError
      if (!data) throw new Error('Invalid signature link')

      setInvitation(data)
      setTournament(data.tournament)
      setPlayer(data.player)

      // Fetch waiver document for this tournament
      if (data.tournament?.id) {
        const { data: waiverData } = await supabase
          .from('documents')
          .select('*')
          .eq('tournament_id', data.tournament.id)
          .eq('is_waiver', true)
          .single()

        if (waiverData) {
          setWaiverDocument(waiverData)
        }
      }

      // Check if already signed
      if (data.signature_url) {
        setSuccess(true)
      }
    } catch (err) {
      console.error('Error fetching invitation:', err)
      setError(err.message || 'Invalid or expired signature link')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSignature = async (dataUrl) => {
    try {
      setSaving(true)
      setError(null)

      // Convert base64 to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      // Upload to Supabase Storage
      const fileName = `signatures/${invitation.id}_${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Update invitation with signature URL
      const { error: updateError } = await supabase
        .from('tournament_invitations')
        .update({
          signature_url: urlData.publicUrl,
          signed_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) throw updateError

      setSuccess(true)
    } catch (err) {
      console.error('Error saving signature:', err)
      setError(err.message || 'Failed to save signature')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Signature Received</h1>
          <p className="text-gray-500 mb-4">
            Thank you, {player?.first_name}! Your signature for {tournament?.name} has been recorded.
          </p>
          <p className="text-sm text-gray-400">You can close this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{tournament?.name}</h1>
          <p className="text-gray-500 mb-4">
            {formatDate(tournament?.date)}
            {tournament?.location && ` • ${tournament.location}`}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 font-medium mb-1">
              Signature requested for:
            </div>
            <div className="text-lg font-bold text-blue-900">
              {player?.first_name} {player?.last_name}
            </div>
          </div>
        </div>

        {/* Waiver Document or Default Text */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Player Agreement</h2>
          {waiverDocument ? (
            <CustomWaiverDocument waiver={waiverDocument} />
          ) : (
            <DefaultWaiverText />
          )}
        </div>

        {/* Signature Pad */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Signature</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {saving ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <SignaturePad onSave={handleSaveSignature} />
          )}
        </div>
      </div>
    </div>
  )
}
