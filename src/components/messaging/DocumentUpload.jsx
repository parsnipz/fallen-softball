import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function DocumentUpload({ tournamentId, documents, onAdd, onDelete, onUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')

    if (!isPdf && !isImage) {
      setError('Please upload a PDF or image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError('')
    setUploading(true)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${tournamentId}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Add document record
      await onAdd({
        name: file.name,
        file_url: urlData.publicUrl,
        file_type: isPdf ? 'pdf' : 'image',
        is_waiver: false,
      })

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.name}"?`)) return

    try {
      // Extract file path from URL
      const url = new URL(doc.file_url)
      const pathParts = url.pathname.split('/documents/')
      const filePath = pathParts[pathParts.length - 1]

      // Delete from storage
      await supabase.storage
        .from('documents')
        .remove([filePath])

      // Delete record
      await onDelete(doc.id)
    } catch (err) {
      console.error('Delete error:', err)
      setError(err.message || 'Failed to delete file')
    }
  }

  const handleSetWaiver = async (doc) => {
    if (!onUpdate) return

    // If this doc is already the waiver, unset it
    if (doc.is_waiver) {
      await onUpdate(doc.id, { is_waiver: false })
    } else {
      // Clear any existing waiver first, then set this one
      const currentWaiver = documents.find(d => d.is_waiver)
      if (currentWaiver) {
        await onUpdate(currentWaiver.id, { is_waiver: false })
      }
      await onUpdate(doc.id, { is_waiver: true })
    }
  }

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const waiverDoc = documents.find(d => d.is_waiver)

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="document-upload"
        />
        <label
          htmlFor="document-upload"
          className="flex flex-col items-center cursor-pointer"
        >
          <svg
            className="h-10 w-10 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="mt-2 text-sm text-gray-500">
            {uploading ? 'Uploading...' : 'Click to upload PDF or image'}
          </span>
          <span className="text-xs text-gray-400">Max 10MB</span>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* Waiver status */}
      {waiverDoc && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm text-purple-700">
          <span className="font-medium">Waiver:</span> {waiverDoc.name}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                doc.is_waiver ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {doc.file_type === 'pdf' ? (
                  <svg className="h-8 w-8 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="min-w-0">
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                  >
                    {doc.name}
                  </a>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase">{doc.file_type}</span>
                    {doc.is_waiver && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        Waiver
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onUpdate && (
                  <button
                    onClick={() => handleSetWaiver(doc)}
                    className={`text-sm ${
                      doc.is_waiver
                        ? 'text-purple-600 hover:text-purple-800 font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {doc.is_waiver ? 'Remove Waiver' : 'Use as Waiver'}
                  </button>
                )}
                <button
                  onClick={() => copyLink(doc.file_url)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No documents uploaded yet
        </p>
      )}
    </div>
  )
}
