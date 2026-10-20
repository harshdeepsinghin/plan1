"use client"

import { createContext, useContext, useMemo } from "react"
import type { ReactNode } from "react"
import {
  createFormatters,
  DEFAULT_PREFERENCES,
  type UserPreferences,
} from "@/lib/preferences"

interface PreferencesContextValue extends UserPreferences {
  formatCurrency: (amount: number | null | undefined) => string
  formatDate: (value: string | Date | null | undefined) => string
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({
  value,
  children,
}: {
  value: UserPreferences
  children: ReactNode
}) {
  const preferences = useMemo(
    () => ({
      ...value,
      ...createFormatters(value),
    }),
    [value]
  )

  return (
    <PreferencesContext.Provider value={preferences}>{children}</PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext)
  if (context) return context

  return {
    ...DEFAULT_PREFERENCES,
    ...createFormatters(DEFAULT_PREFERENCES),
  }
}
