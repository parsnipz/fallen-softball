import { useState, useMemo } from 'react'

export default function SignatureManager({ invitations, tournamentName }) {
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedSingle, setCopiedSingle] = useState(null)

  // Get base URL for signature links
  const baseUrl = window.location.origin

  // Filter to only "in" players
  const inPlayers = useMemo(() => {
    return invitations.filter(inv => inv.status === 'in')
  }, [invitations])

  // Split into signed and unsigned
  const { signed, unsigned } = useMemo(() => {
    return {
      signed: inPlayers.filter(inv => inv.signature_url),
      unsigned: inPlayers.filter(inv => !inv.signature_url)
    }
  }, [inPlayers])

  const getSignatureLink = (inv) => {
    return `${baseUrl}/sign/${inv.signature_token}`
  }

  const handleCopyAllLinks = async () => {
    const links = unsigned.map(inv => {
      const name = `${inv.player?.first_name} ${inv.player?.last_name}`
      const link = getSignatureLink(inv)
      return `${name}: ${link}`
    }).join('\n')

    const message = `${tournamentName} - Signature Links:\n\n${links}`

    try {
      await navigator.clipboard.writeText(message)
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCopySingleLink = async (inv) => {
    const link = getSignatureLink(inv)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedSingle(inv.id)
      setTimeout(() => setCopiedSingle(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (inPlayers.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No players marked as "In" yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-green-600">{signed.length}</span>
          <span className="text-sm text-gray-500">Signed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-yellow-600">{unsigned.length}</span>
          <span className="text-sm text-gray-500">Pending</span>
        </div>
        <div className="flex-1" />
        {unsigned.length > 0 && (
          <button
            onClick={handleCopyAllLinks}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              copiedAll
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copiedAll ? 'Copied!' : 'Copy All Links'}
          </button>
        )}
      </div>

      {/* Unsigned players */}
      {unsigned.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Awaiting Signature</h4>
          <div className="space-y-2">
            {unsigned.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-yellow-800">
                  {inv.player?.first_name} {inv.player?.last_name}
                </span>
                <button
                  onClick={() => handleCopySingleLink(inv)}
                  className={`text-xs px-2 py-1 rounded ${
                    copiedSingle === inv.id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  }`}
                >
                  {copiedSingle === inv.id ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signed players */}
      {signed.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Signatures Received</h4>
          <div className="space-y-2">
            {signed.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
              >
                <span className="text-sm text-green-800">
                  {inv.player?.first_name} {inv.player?.last_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600">
                    {inv.signed_at && new Date(inv.signed_at).toLocaleDateString()}
                  </span>
                  {inv.signature_url && (
                    <a
                      href={inv.signature_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Share individual links with players or copy all links to paste into your group chat.
      </p>
    </div>
  )
}
