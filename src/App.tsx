import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import Layout from '@/components/Layout'
import { AuthProvider } from '@/components/AuthProvider'
import { ToastProvider } from '@/components/Toast'
import { ThemeProvider } from '@/lib/theme-context'
import { LangProvider } from '@/lib/lang-context'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Catalog = lazy(() => import('@/pages/Catalog'))
const ExerciseDetail = lazy(() => import('@/pages/ExerciseDetail'))
const Routines = lazy(() => import('@/pages/Routines'))
const RoutineDetail = lazy(() => import('@/pages/RoutineDetail'))
const Train = lazy(() => import('@/pages/Train'))
const History = lazy(() => import('@/pages/History'))
const Stats = lazy(() => import('@/pages/Stats'))
const Profile = lazy(() => import('@/pages/Profile'))
const Login = lazy(() => import('@/pages/Login'))

function RequireAuth() {
  const { user, loading } = useAuth()
  const { t } = useLang()
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center gap-3 bg-bg">
        <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-edge2 border-t-emerald-500" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <Dashboard /> },
          { path: '/ejercicios', element: <Catalog /> },
          { path: '/ejercicios/:id', element: <ExerciseDetail /> },
          { path: '/rutinas', element: <Routines /> },
          { path: '/rutinas/:id', element: <RoutineDetail /> },
          { path: '/entrenar/:dayId', element: <Train /> },
          { path: '/historial', element: <History /> },
          { path: '/estadisticas', element: <Stats /> },
          { path: '/perfil', element: <Profile /> },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<AppFallback />}>
        <Login />
      </Suspense>
    ),
  },
])

function AppFallback() {
  const { t } = useLang()
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center gap-3 bg-bg"
    >
      <div
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-edge2 border-t-emerald-500"
      />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<AppFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  )
}