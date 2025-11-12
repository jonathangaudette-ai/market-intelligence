import { useEffect, useState } from "react"

interface SidebarStats {
  messages: number
  documents: number
}

export function useSidebarStats(slug: string) {
  const [stats, setStats] = useState<SidebarStats>({ messages: 0, documents: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!slug || slug === 'demo-company') {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const response = await fetch(`/api/companies/${slug}/stats/sidebar`)

        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch sidebar stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [slug])

  return { stats, isLoading }
}
