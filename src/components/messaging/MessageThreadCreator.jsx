import { useState, useMemo } from 'react'
import { generateSmsUrl, copyToClipboard, isMobile, cleanPhone } from '../../lib/utils'

export default function MessageThreadCreator({ invitations }) {
  const [includeOut, setIncludeOut] = useState(false)
  const [copied, setCopied] = useState(false)

  // Get phone numbers based on settings
  const phoneNumbers = useMemo(() => {
    return invitations
      .filter(inv => {
        if (inv.status === 'out' && !includeOut) return false
        return inv.player?.phone
      })
      .map(inv => inv.player.phone)
  }, [invitations, includeOut])

  const handleCreateThread = async () => {
    if (phoneNumbers.length === 0) return

    const mobile = isMobile()

    if (mobile) {
      // Open SMS app on mobile
      const smsUrl = generateSmsUrl(phoneNumbers)
      if (smsUrl) {
        window.location.href = smsUrl
      }
    } else {
      // Copy to clipboard on desktop
      const formattedNumbers = phoneNumbers.map(cleanPhone).join(', ')
      const success = await copyToClipboard(formattedNumbers)
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const statusCounts = useMemo(() => {
    const counts = { in: 0, pending: 0, out: 0 }
    invitations.forEach(inv => {
      if (inv.player?.phone) {
        counts[inv.status]++
      }
    })
    return counts
  }, [invitations])

  const recipientCount = includeOut
    ? statusCounts.in + statusCounts.pending + statusCounts.out
    : statusCounts.in + statusCounts.pending

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeOut}
            onChange={(e) => setIncludeOut(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-600">
            Include "Out" players
          </span>
        </label>
        <span className="text-sm text-gray-500">
          {recipientCount} player{recipientCount !== 1 ? 's' : ''} with phone numbers
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCreateThread}
          disabled={phoneNumbers.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMobile() ? 'Create Message Thread' : 'Copy Phone Numbers'}
        </button>
        {copied && (
          <span className="px-3 py-2 text-sm text-green-600">
            Copied to clipboard!
          </span>
        )}
      </div>

      {!isMobile() && (
        <p className="text-xs text-gray-500">
          On desktop, phone numbers will be copied to your clipboard. On mobile, your Messages app will open.
        </p>
      )}

      {/* Quick stats */}
      <div className="text-xs text-gray-500 pt-2 border-t">
        Players with phone numbers: {statusCounts.in} In, {statusCounts.pending} Pending, {statusCounts.out} Out
      </div>
    </div>
  )
}
