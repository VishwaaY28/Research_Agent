"use client"

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AuthForm } from "@/components/auth/AuthForm"
import { useAuth } from "@/hooks/useAuth"

export function Auth() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate("/dashboard")
    }
  }, [user, navigate])

  return <AuthForm />
}