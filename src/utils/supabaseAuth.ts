// Supabase Authentication Utilities
import { supabase, getCurrentUser, getCurrentProfile } from '../lib/supabase'
import { User } from '../types'

// Sign up new user
export const signUp = async (email: string, password: string, userData: {
  username: string
  name: string
  role: string
  departments: string[]
  countries: string[]
}) => {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username: userData.username,
        name: userData.name,
        role: userData.role as any,
        departments: userData.departments,
        countries: userData.countries,
        enabled: true
      })
      .select()
      .single()

    if (profileError) throw profileError

    return { user: authData.user, profile }
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

// Sign in user
export const signIn = async (email: string, password: string, country: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (!data.user) throw new Error('Invalid credentials')

    // Get user profile
    const profile = await getCurrentProfile()
    if (!profile) throw new Error('Profile not found')

    // Check if user is enabled
    if (!profile.enabled) {
      throw new Error('Your account has been disabled. Please contact your administrator.')
    }

    // Check country access
    if (profile.role !== 'admin' && !profile.countries.includes(country)) {
      throw new Error('Your account is not assigned to the selected country')
    }

    // Update selected country
    await supabase
      .from('profiles')
      .update({ selected_country: country })
      .eq('id', profile.id)

    return {
      user: {
        ...profile,
        selectedCountry: country
      } as User,
      session: data.session
    }
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

// Get current authenticated user with profile
export const getAuthenticatedUser = async (): Promise<User | null> => {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const profile = await getCurrentProfile()
    if (!profile) return null

    return {
      id: profile.id,
      username: profile.username,
      password: '', // Never expose password
      role: profile.role,
      name: profile.name,
      departments: profile.departments,
      countries: profile.countries,
      selectedCountry: profile.selected_country || undefined,
      enabled: profile.enabled
    } as User
  } catch (error) {
    console.error('Get authenticated user error:', error)
    return null
  }
}

// Sign out
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser()
    return !!user
  } catch (error) {
    console.error('Auth check error:', error)
    return false
  }
}

// Get all users (admin only)
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return profiles.map(profile => ({
      id: profile.id,
      username: profile.username,
      password: '', // Never expose password
      role: profile.role,
      name: profile.name,
      departments: profile.departments,
      countries: profile.countries,
      selectedCountry: profile.selected_country || undefined,
      enabled: profile.enabled
    })) as User[]
  } catch (error) {
    console.error('Get all users error:', error)
    throw error
  }
}

// Update user profile (admin only)
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        name: updates.name,
        role: updates.role as any,
        departments: updates.departments,
        countries: updates.countries,
        enabled: updates.enabled
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Update user profile error:', error)
    throw error
  }
}

// Create user (admin only)
export const createUser = async (userData: Omit<User, 'id'> & { email: string, password: string }) => {
  try {
    return await signUp(userData.email, userData.password, {
      username: userData.username,
      name: userData.name,
      role: userData.role,
      departments: userData.departments,
      countries: userData.countries
    })
  } catch (error) {
    console.error('Create user error:', error)
    throw error
  }
}