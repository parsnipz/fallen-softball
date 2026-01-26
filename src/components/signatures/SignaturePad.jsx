import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function SignaturePad({ onSave, onCancel }) {
  const sigCanvas = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleClear = () => {
    sigCanvas.current.clear()
    setIsEmpty(true)
  }

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current.isEmpty())
  }

  const handleSave = () => {
    if (sigCanvas.current.isEmpty()) return

    // Get the signature as a base64 PNG
    const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-gray-300 rounded-lg bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: 'w-full h-48 rounded-lg',
            style: { width: '100%', height: '192px' }
          }}
          onEnd={handleEnd}
        />
      </div>
      <p className="text-xs text-gray-500 text-center">
        Sign above using your finger or stylus
      </p>
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Signature
        </button>
      </div>
    </div>
  )
}
