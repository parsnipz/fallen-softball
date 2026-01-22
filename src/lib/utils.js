// Jersey type options with colors for display
export const JERSEY_TYPES = [
  { id: 'Confetti White', label: 'Confetti White', color: 'bg-white border border-gray-300', abbrev: 'W' },
  { id: 'Confetti Red', label: 'Confetti Red', color: 'bg-red-500', abbrev: 'R' },
  { id: 'Grey Striped', label: 'Grey Striped', color: 'bg-gray-400', abbrev: 'G' },
  { id: 'Sunset', label: 'Sunset', color: 'bg-orange-400', abbrev: 'O' },
]

// Jersey sizes by gender
export const JERSEY_SIZES = {
  M: ['M-XS', 'M-S', 'M-M', 'M-L', 'M-XL', 'M-2XL', 'M-3XL'],
  F: ['W-XS', 'W-S', 'W-M', 'W-L', 'W-XL', 'W-2XL'],
}

// Get jersey type by id
export function getJerseyType(id) {
  return JERSEY_TYPES.find(j => j.id === id)
}

// Format date for display (handles timezone issue with date-only strings)
export function formatDate(dateString) {
  if (!dateString) return ''
  // Parse as local date to avoid timezone shift
  // Date strings like "2026-01-23" are interpreted as UTC, causing off-by-one errors
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Format phone number for display
export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Clean phone number for SMS
export function cleanPhone(phone) {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

// Generate SMS URL from phone numbers
export function generateSmsUrl(phoneNumbers) {
  if (!phoneNumbers || phoneNumbers.length === 0) return null
  const cleaned = phoneNumbers.map(cleanPhone).filter(Boolean)
  if (cleaned.length === 0) return null

  // iOS uses comma, Android uses semicolon - comma works for both in most cases
  return `sms:${cleaned.join(',')}`
}

// Copy text to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

// Check if device is mobile
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Export data to CSV
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Handle arrays, nulls, and values with commas
        if (Array.isArray(value)) {
          return `"${value.join('; ')}"`
        }
        if (value === null || value === undefined) {
          return ''
        }
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Get status badge color
export function getStatusColor(status) {
  switch (status) {
    case 'in':
      return 'bg-green-100 text-green-800'
    case 'out':
      return 'bg-red-100 text-red-800'
    case 'pending':
    default:
      return 'bg-yellow-100 text-yellow-800'
  }
}

// Calculate age from date of birth
export function calculateAge(dob) {
  if (!dob) return null
  const today = new Date()
  const birthDate = new Date(dob)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
