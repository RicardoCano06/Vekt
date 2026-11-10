import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

interface ThemeContextValue {
  dark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ dark: true, toggle: () => {} })

function initialDark(): boolean {
  try {
    return (localStorage.getItem('gymtrack-theme') ?? 'dark') !== 'light'
  } catch {
    return true
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(initialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#0a0910' : '#f7f5fb')
    try {
      localStorage.setItem('gymtrack-theme', dark ? 'dark' : 'light')
    } catch {
      // almacenamiento no disponible: el tema vive solo en la sesión
    }
  }, [dark])

  const toggle = () => setDark((d) => !d)

  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
