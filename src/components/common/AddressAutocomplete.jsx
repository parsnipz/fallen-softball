import { useEffect, useRef, useState } from 'react'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY

// Load Google Maps script dynamically with async
let googleMapsPromise = null
function loadGoogleMaps() {
  if (googleMapsPromise) return googleMapsPromise

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google)
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_API_KEY) {
      reject(new Error('Google Places API key not configured'))
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export default function AddressAutocomplete({ value, onChange, onPlaceSelect, placeholder, className }) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const onChangeRef = useRef(onChange)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect
    onChangeRef.current = onChange
  }, [onPlaceSelect, onChange])

  useEffect(() => {
    if (!GOOGLE_API_KEY) {
      setError('API key not configured')
      return
    }

    loadGoogleMaps()
      .then((google) => {
        setIsLoaded(true)
      })
      .catch((err) => {
        setError(err.message)
        console.error('Google Maps load error:', err)
      })
  }, [])

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    try {
      // Use the Places Autocomplete service
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address', 'place_id'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place?.formatted_address) {
          const address = place.formatted_address
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}&query_place_id=${place.place_id || ''}`

          // Call onPlaceSelect if provided, otherwise just onChange
          if (onPlaceSelectRef.current) {
            onPlaceSelectRef.current({ address, maps_url: mapsUrl })
          } else if (onChangeRef.current) {
            onChangeRef.current(address)
          }
        }
      })

      autocompleteRef.current = autocomplete
    } catch (err) {
      console.error('Autocomplete init error:', err)
      setError('Failed to initialize autocomplete')
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isLoaded])

  // Handle manual input changes
  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  // Prevent form submission on Enter when selecting from dropdown
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Check if the pac-container (autocomplete dropdown) is visible
      const pacContainer = document.querySelector('.pac-container')
      if (pacContainer && pacContainer.style.display !== 'none') {
        e.preventDefault()
      }
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Start typing an address...'}
        className={className}
        autoComplete="off"
      />
      {error && !GOOGLE_API_KEY && (
        <p className="text-xs text-amber-600 mt-1">
          Address autocomplete disabled. Add VITE_GOOGLE_PLACES_API_KEY to enable.
        </p>
      )}
    </div>
  )
}
