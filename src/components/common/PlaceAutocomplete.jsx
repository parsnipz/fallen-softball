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

export default function PlaceAutocomplete({ value, onChange, onPlaceSelect, placeholder, className }) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)

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
      // Use the Places Autocomplete service for establishments (parks, fields, etc.)
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment'],
        componentRestrictions: { country: 'us' },
        fields: ['name', 'formatted_address', 'address_components', 'url', 'place_id', 'geometry'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place) {
          // Extract city and state from address components
          let city = ''
          let state = ''
          if (place.address_components) {
            for (const component of place.address_components) {
              if (component.types.includes('locality')) {
                city = component.long_name
              }
              if (component.types.includes('administrative_area_level_1')) {
                state = component.short_name
              }
            }
          }

          // Build Google Maps URL
          const mapsUrl = place.url ||
            (place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : '')

          // Call the onPlaceSelect callback with all the place details
          if (onPlaceSelect) {
            onPlaceSelect({
              name: place.name || '',
              address: place.formatted_address || '',
              city,
              state,
              maps_url: mapsUrl,
            })
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
  }, [isLoaded, onPlaceSelect])

  // Handle manual input changes
  const handleInputChange = (e) => {
    if (onChange) {
      onChange(e.target.value)
    }
  }

  // Prevent form submission on Enter when selecting from dropdown
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
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
        placeholder={placeholder || 'Search for a park or field...'}
        className={className}
        autoComplete="off"
      />
      {error && !GOOGLE_API_KEY && (
        <p className="text-xs text-amber-600 mt-1">
          Place autocomplete disabled. Add VITE_GOOGLE_PLACES_API_KEY to enable.
        </p>
      )}
    </div>
  )
}
