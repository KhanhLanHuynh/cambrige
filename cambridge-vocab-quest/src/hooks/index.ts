import { useCallback, useEffect, useState } from 'react'

function currentPath() {
  return window.location.pathname
}

export function useRouter() {
  const [path, setPath] = useState(currentPath)

  useEffect(() => {
    const onPopState = () => setPath(currentPath())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to)
    setPath(new URL(to, window.location.origin).pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { path, navigate }
}
