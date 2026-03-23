import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ercnehjywfphrgqaepzi.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyY25laGp5d2ZwaHJncWFlcHppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NzIxNTAsImV4cCI6MjA4NjE0ODE1MH0.I0mFLNeqxK25nJEoF4omFN58F0HelrVoyT65Fi4tZB8'
const supabase = createClient(supabaseUrl, supabaseKey)

const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD || '8842706'

interface Department {
  name: string
  fullName: string
  url: string
  color: string
  dbPrefix: string
  icon: string
  note?: string
}

const departments: Department[] = [
  { name: 'HCU', fullName: '高度治療室', url: 'https://hcu-schedule-app.vercel.app', color: 'blue', dbPrefix: 'hcu', icon: 'H' },
  { name: '救急外来', fullName: 'Emergency Room', url: 'https://hcu-schedule-app.vercel.app', color: 'red', dbPrefix: 'emergency', icon: 'ER', note: 'HCUアプリ内の救急外来を選択' },
  { name: '4階西病棟', fullName: '4W', url: 'https://w4-schedule-app.vercel.app', color: 'purple', dbPrefix: 'w4', icon: '4W' },
  { name: '3階西病棟', fullName: '3W', url: 'https://w3-schedule-app.vercel.app', color: 'teal', dbPrefix: 'w3', icon: '3W' },
  { name: '3階東病棟', fullName: '3E', url: 'https://e3-schedule-app.vercel.app', color: 'green', dbPrefix: 'e3', icon: '3E' },
  { name: '4階東病棟', fullName: '4E', url: 'https://e4-schedule-app.vercel.app', color: 'amber', dbPrefix: 'e4', icon: '4E' },
  { name: '5階病棟', fullName: '5F', url: 'https://f5-schedule-app.vercel.app', color: 'indigo', dbPrefix: 'f5', icon: '5F' },
  { name: '外来', fullName: 'Outpatient', url: 'https://outpatient-schedule-app.vercel.app', color: 'pink', dbPrefix: 'outpatient', icon: 'OPD' },
]

const colorMap: Record<string, { bg: string; text: string; badge: string; border: string; btnBg: string; btnHover: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-500',   border: 'border-blue-200',   btnBg: 'bg-blue-600',   btnHover: 'hover:bg-blue-700' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-500',    border: 'border-red-200',    btnBg: 'bg-red-600',    btnHover: 'hover:bg-red-700' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-500', border: 'border-purple-200', btnBg: 'bg-purple-600', btnHover: 'hover:bg-purple-700' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   badge: 'bg-teal-500',   border: 'border-teal-200',   btnBg: 'bg-teal-600',   btnHover: 'hover:bg-teal-700' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-500',  border: 'border-green-200',  btnBg: 'bg-green-600',  btnHover: 'hover:bg-green-700' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  badge: 'bg-amber-500',  border: 'border-amber-200',  btnBg: 'bg-amber-600',  btnHover: 'hover:bg-amber-700' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-500', border: 'border-indigo-200', btnBg: 'bg-indigo-600', btnHover: 'hover:bg-indigo-700' },
  pink:   { bg: 'bg-pink-50',   text: 'text-pink-700',   badge: 'bg-pink-500',   border: 'border-pink-200',   btnBg: 'bg-pink-600',   btnHover: 'hover:bg-pink-700' },
}

interface DeptStats {
  nurseCount: number | null
  requestCount: number | null
}

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())
  const [stats, setStats] = useState<Record<string, DeptStats>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    const results: Record<string, DeptStats> = {}

    await Promise.all(
      departments.map(async (dept) => {
        let nurseCount: number | null = null
        let requestCount: number | null = null

        try {
          const { count } = await supabase
            .from(`${dept.dbPrefix}_nurses`)
            .select('*', { count: 'exact', head: true })
            .eq('active', true)
          nurseCount = count
        } catch {
          nurseCount = null
        }

        try {
          const { count } = await supabase
            .from(`${dept.dbPrefix}_requests`)
            .select('*', { count: 'exact', head: true })
            .gte('date', monthStart)
            .lt('date', monthEnd)
          requestCount = count
        } catch {
          requestCount = null
        }

        results[dept.dbPrefix] = { nurseCount, requestCount }
      })
    )

    setStats(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authenticated) {
      fetchStats()
    }
  }, [authenticated, fetchStats])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === DEV_PASSWORD) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('パスワードが正しくありません')
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-6">
          <h1 className="text-2xl font-bold text-center text-gray-800">共愛会 勤務表管理ポータル</h1>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="パスワードを入力"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            ログイン
          </button>
        </form>
      </div>
    )
  }

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) +
      ' ' + d.toLocaleTimeString('ja-JP')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">共愛会 勤務表管理ポータル</h1>
            <p className="text-sm text-gray-500">{formatDate(now)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? '更新中...' : '全部署を更新'}
            </button>
            <button
              onClick={() => setAuthenticated(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {departments.map((dept) => {
            const c = colorMap[dept.color]
            const deptStats = stats[dept.dbPrefix]
            return (
              <div
                key={dept.dbPrefix}
                className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border ${c.border} overflow-hidden`}
              >
                <div className={`${c.bg} p-5`}>
                  <div className="flex items-center gap-4">
                    <div className={`${c.badge} w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                      {dept.icon}
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-gray-800">{dept.name}</h2>
                      <p className="text-sm text-gray-500">{dept.fullName}</p>
                    </div>
                  </div>
                  {dept.note && (
                    <p className="text-xs text-gray-500 mt-2 bg-white/60 rounded-lg px-3 py-1.5">{dept.note}</p>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">登録職員数</p>
                      <p className={`text-2xl font-bold ${c.text}`}>
                        {deptStats?.nurseCount != null ? deptStats.nurseCount : '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">今月の希望</p>
                      <p className={`text-2xl font-bold ${c.text}`}>
                        {deptStats?.requestCount != null ? deptStats.requestCount : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={dept.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 ${c.btnBg} text-white text-center py-2.5 rounded-xl text-sm font-medium ${c.btnHover} transition-colors`}
                    >
                      管理者画面を開く
                    </a>
                    <a
                      href={dept.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-100 text-gray-700 text-center py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      職員画面を開く
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default App
