import { supabase } from './supabaseClient'

export const getUserCredits = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data.credits
}

export const updateUserCredits = async (userId: string, credits: number) => {
  const { data, error } = await supabase
    .from('users')
    .update({ credits })
    .eq('id', userId)

  if (error) throw error
  return data
}

export const logCreditUsage = async (userId: string, creditsUsed: number, action: string) => {
  const { data, error } = await supabase
    .from('credit_usage_history')
    .insert({ user_id: userId, credits_used: creditsUsed, action })

  if (error) throw error
  return data
}
