import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTournaments() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: false })

      if (fetchError) throw fetchError
      setTournaments(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching tournaments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTournaments()
  }, [fetchTournaments])

  const addTournament = async (tournamentData) => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select()
        .single()

      if (error) throw error
      setTournaments(prev => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      console.error('Error adding tournament:', err)
      return { data: null, error: err.message }
    }
  }

  const updateTournament = async (id, tournamentData) => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .update(tournamentData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setTournaments(prev => prev.map(t => t.id === id ? data : t))
      return { data, error: null }
    } catch (err) {
      console.error('Error updating tournament:', err)
      return { data: null, error: err.message }
    }
  }

  const deleteTournament = async (id) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTournaments(prev => prev.filter(t => t.id !== id))
      return { error: null }
    } catch (err) {
      console.error('Error deleting tournament:', err)
      return { error: err.message }
    }
  }

  const archiveTournament = async (id, archived = true) => {
    return updateTournament(id, { archived })
  }

  return {
    tournaments,
    loading,
    error,
    refetch: fetchTournaments,
    addTournament,
    updateTournament,
    deleteTournament,
    archiveTournament,
  }
}

export function useTournamentDetail(tournamentId) {
  const [tournament, setTournament] = useState(null)
  const [invitations, setInvitations] = useState([])
  const [documents, setDocuments] = useState([])
  const [lodgingOptions, setLodgingOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch tournament with park info
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          *,
          park:parks(*)
        `)
        .eq('id', tournamentId)
        .single()

      if (tournamentError) throw tournamentError

      // Fetch invitations with player details
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('tournament_invitations')
        .select(`
          *,
          player:players(*)
        `)
        .eq('tournament_id', tournamentId)

      if (invitationsError) throw invitationsError

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: false })

      if (documentsError) throw documentsError

      // Fetch lodging options
      const { data: lodgingData, error: lodgingError } = await supabase
        .from('tournament_lodging')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true })

      if (lodgingError) throw lodgingError

      setTournament(tournamentData)
      setInvitations(invitationsData || [])
      setDocuments(documentsData || [])
      setLodgingOptions(lodgingData || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching tournament detail:', err)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    fetchTournament()
  }, [fetchTournament])

  const invitePlayer = async (playerId) => {
    try {
      const { data, error } = await supabase
        .from('tournament_invitations')
        .insert([{
          tournament_id: tournamentId,
          player_id: playerId,
          status: 'pending'
        }])
        .select(`
          *,
          player:players(*)
        `)
        .single()

      if (error) throw error
      setInvitations(prev => [...prev, data])
      return { data, error: null }
    } catch (err) {
      console.error('Error inviting player:', err)
      return { data: null, error: err.message }
    }
  }

  const updateInvitationStatus = async (invitationId, status) => {
    try {
      const { data, error } = await supabase
        .from('tournament_invitations')
        .update({ status })
        .eq('id', invitationId)
        .select(`
          *,
          player:players(*)
        `)
        .single()

      if (error) throw error
      setInvitations(prev => prev.map(inv => inv.id === invitationId ? data : inv))
      return { data, error: null }
    } catch (err) {
      console.error('Error updating invitation:', err)
      return { data: null, error: err.message }
    }
  }

  const updateInvitationPaid = async (invitationId, paid) => {
    try {
      const { data, error } = await supabase
        .from('tournament_invitations')
        .update({ paid })
        .eq('id', invitationId)
        .select(`
          *,
          player:players(*)
        `)
        .single()

      if (error) throw error
      setInvitations(prev => prev.map(inv => inv.id === invitationId ? data : inv))
      return { data, error: null }
    } catch (err) {
      console.error('Error updating paid status:', err)
      return { data: null, error: err.message }
    }
  }

  const removeInvitation = async (invitationId) => {
    try {
      const { error } = await supabase
        .from('tournament_invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      return { error: null }
    } catch (err) {
      console.error('Error removing invitation:', err)
      return { error: err.message }
    }
  }

  const addDocument = async (documentData) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([{
          ...documentData,
          tournament_id: tournamentId
        }])
        .select()
        .single()

      if (error) throw error
      setDocuments(prev => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      console.error('Error adding document:', err)
      return { data: null, error: err.message }
    }
  }

  const deleteDocument = async (documentId) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (error) throw error
      setDocuments(prev => prev.filter(d => d.id !== documentId))
      return { error: null }
    } catch (err) {
      console.error('Error deleting document:', err)
      return { error: err.message }
    }
  }

  const updateDocument = async (documentId, documentData) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(documentData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error
      setDocuments(prev => prev.map(d => d.id === documentId ? data : d))
      return { data, error: null }
    } catch (err) {
      console.error('Error updating document:', err)
      return { data: null, error: err.message }
    }
  }

  // Lodging operations
  const addLodgingOption = async (lodgingData) => {
    try {
      const { data, error } = await supabase
        .from('tournament_lodging')
        .insert([{
          ...lodgingData,
          tournament_id: tournamentId
        }])
        .select()
        .single()

      if (error) throw error
      setLodgingOptions(prev => [...prev, data])
      return { data, error: null }
    } catch (err) {
      console.error('Error adding lodging:', err)
      return { data: null, error: err.message }
    }
  }

  const updateLodgingOption = async (lodgingId, lodgingData) => {
    try {
      const { data, error } = await supabase
        .from('tournament_lodging')
        .update(lodgingData)
        .eq('id', lodgingId)
        .select()
        .single()

      if (error) throw error
      setLodgingOptions(prev => prev.map(l => l.id === lodgingId ? data : l))
      return { data, error: null }
    } catch (err) {
      console.error('Error updating lodging:', err)
      return { data: null, error: err.message }
    }
  }

  const deleteLodgingOption = async (lodgingId) => {
    try {
      const { error } = await supabase
        .from('tournament_lodging')
        .delete()
        .eq('id', lodgingId)

      if (error) throw error
      setLodgingOptions(prev => prev.filter(l => l.id !== lodgingId))
      // Clear lodging_id from any invitations that had this lodging
      setInvitations(prev => prev.map(inv =>
        inv.lodging_id === lodgingId
          ? { ...inv, lodging_id: null, lodging_status: null }
          : inv
      ))
      return { error: null }
    } catch (err) {
      console.error('Error deleting lodging:', err)
      return { error: err.message }
    }
  }

  const updateInvitationLodging = async (invitationId, lodgingData) => {
    try {
      const { data, error } = await supabase
        .from('tournament_invitations')
        .update(lodgingData)
        .eq('id', invitationId)
        .select(`
          *,
          player:players(*)
        `)
        .single()

      if (error) throw error
      setInvitations(prev => prev.map(inv => inv.id === invitationId ? data : inv))
      return { data, error: null }
    } catch (err) {
      console.error('Error updating invitation lodging:', err)
      return { data: null, error: err.message }
    }
  }

  const uploadTournamentImage = async (file) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `tournament-${tournamentId}-${Date.now()}.${fileExt}`
      const filePath = `tournament-images/${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Update tournament with image URL
      const { data, error: updateError } = await supabase
        .from('tournaments')
        .update({ image_url: publicUrl })
        .eq('id', tournamentId)
        .select()
        .single()

      if (updateError) throw updateError
      setTournament(data)
      return { data, error: null }
    } catch (err) {
      console.error('Error uploading tournament image:', err)
      return { data: null, error: err.message }
    }
  }

  const updateTournament = async (tournamentData) => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .update(tournamentData)
        .eq('id', tournamentId)
        .select()
        .single()

      if (error) throw error
      setTournament(data)
      return { data, error: null }
    } catch (err) {
      console.error('Error updating tournament:', err)
      return { data: null, error: err.message }
    }
  }

  return {
    tournament,
    invitations,
    documents,
    lodgingOptions,
    loading,
    error,
    refetch: fetchTournament,
    invitePlayer,
    updateInvitationStatus,
    updateInvitationPaid,
    updateInvitationLodging,
    removeInvitation,
    addDocument,
    updateDocument,
    deleteDocument,
    addLodgingOption,
    updateLodgingOption,
    deleteLodgingOption,
    uploadTournamentImage,
    updateTournament,
  }
}
