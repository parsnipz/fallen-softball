import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useParks() {
  const [parks, setParks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchParks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('parks')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) throw fetchError
      setParks(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching parks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchParks()
  }, [fetchParks])

  const addPark = async (parkData) => {
    try {
      const { data, error } = await supabase
        .from('parks')
        .insert([parkData])
        .select()
        .single()

      if (error) throw error
      setParks(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return { data, error: null }
    } catch (err) {
      console.error('Error adding park:', err)
      return { data: null, error: err.message }
    }
  }

  const updatePark = async (id, parkData) => {
    try {
      const { data, error } = await supabase
        .from('parks')
        .update(parkData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setParks(prev => prev.map(p => p.id === id ? data : p).sort((a, b) => a.name.localeCompare(b.name)))
      return { data, error: null }
    } catch (err) {
      console.error('Error updating park:', err)
      return { data: null, error: err.message }
    }
  }

  const deletePark = async (id) => {
    try {
      const { error } = await supabase
        .from('parks')
        .delete()
        .eq('id', id)

      if (error) throw error
      setParks(prev => prev.filter(p => p.id !== id))
      return { error: null }
    } catch (err) {
      console.error('Error deleting park:', err)
      return { error: err.message }
    }
  }

  return {
    parks,
    loading,
    error,
    refetch: fetchParks,
    addPark,
    updatePark,
    deletePark,
  }
}
