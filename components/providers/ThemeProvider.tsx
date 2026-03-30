'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'medium' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => undefined,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && ['dark', 'medium', 'light'].includes(stored)) {
      setThemeState(stored)
      applyTheme(stored)
    }
  }, [])

  function applyTheme(t: Theme) {
    const root = document.documentElement
    root.classList.remove('dark', 'medium', 'light')
    root.classList.add(t)
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    applyTheme(t)
    localStorage.setItem('theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
