// Re-export the comprehensive Supabase service
export * from './supabaseService'
import supabaseService from './supabaseService'

// Legacy compatibility - re-export main operations with original names
export const caseOperations = supabaseService.caseOperations
export const userOperations = supabaseService.userOperations
export const subscriptions = supabaseService.subscriptions

// Authentication helpers from Supabase client
import { supabase } from './supabase'

export const auth = {
  // Sign up
  async signUp(email: string, password: string, metadata?: object) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  },

  // Sign in
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}