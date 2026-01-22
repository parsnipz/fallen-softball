import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayers() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPlayers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .order('last_name', { ascending: true })

      if (fetchError) throw fetchError
      setPlayers(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching players:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const addPlayer = async (playerData) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([playerData])
        .select()
        .single()

      if (error) throw error
      setPlayers(prev => [...prev, data].sort((a, b) =>
        a.last_name.localeCompare(b.last_name)
      ))
      return { data, error: null }
    } catch (err) {
      console.error('Error adding player:', err)
      return { data: null, error: err.message }
    }
  }

  const updatePlayer = async (id, playerData) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .update(playerData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setPlayers(prev =>
        prev.map(p => p.id === id ? data : p).sort((a, b) =>
          a.last_name.localeCompare(b.last_name)
        )
      )
      return { data, error: null }
    } catch (err) {
      console.error('Error updating player:', err)
      return { data: null, error: err.message }
    }
  }

  const deletePlayer = async (id) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)

      if (error) throw error
      setPlayers(prev => prev.filter(p => p.id !== id))
      return { error: null }
    } catch (err) {
      console.error('Error deleting player:', err)
      return { error: err.message }
    }
  }

  return {
    players,
    loading,
    error,
    refetch: fetchPlayers,
    addPlayer,
    updatePlayer,
    deletePlayer,
  }
}
