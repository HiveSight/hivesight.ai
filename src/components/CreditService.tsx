import { supabase } from './supabaseClient'
import { User } from '@supabase/supabase-js'

export const getUserCredits = async (user: User | null): Promise<number> => {
  try {
    if (!user) {
      throw new Error('No user provided')
    }

    const { data, error } = await supabase
      .from('extra_credits')
      .select('credits')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (error) throw error

    if (!data) {
      console.log('No credits found for user')
      return 0
    }

    return data.credits
  } catch (error) {
    console.error('Error fetching user credits:', error)
    throw error
  }
}
