import { useState, useEffect, createContext, useContext } from 'react'
import { useApi } from './useApi'
import toast from 'react-hot-toast'

interface User {
  id: number
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { request } = useApi()

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const userData = await request({
        url: '/auth/session',
        method: 'GET',
      })
      setUser(userData)
    } catch (error) {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await request({
        url: '/auth/login',
        method: 'POST',
        data: { email, password },
      })
      
      localStorage.setItem('token', response.access_token)
      await checkAuth()
      toast.success('Login successful!')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      await request({
        url: '/auth/register',
        method: 'POST',
        data: { name, email, password },
      })
      
      await login(email, password)
      toast.success('Registration successful!')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.success('Logged out successfully')
  }

  return {
    user,
    login,
    register,
    logout,
    loading,
  }
}

export { AuthContext }