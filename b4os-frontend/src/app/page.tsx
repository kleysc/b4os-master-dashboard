import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardData } from '@/lib/dashboard-data'
import ProtectedContent from '@/components/ProtectedContent'
import DashboardClient from '@/components/DashboardClient'
import UserProfile from '@/components/UserProfile'
import LanguageSelector from '@/components/LanguageSelector'

export default async function Home() {
  // Check authentication on server
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  if (!session.user?.isAuthorized) {
    // User not authorized - ProtectedContent will handle this
    return (
      <ProtectedContent>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <p className="text-white">Unauthorized</p>
          </div>
        </div>
      </ProtectedContent>
    )
  }

  // Fetch all data on server - this never reaches the client
  let dashboardData
  try {
    dashboardData = await getDashboardData()
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    dashboardData = {
      leaderboard: [],
      assignments: [],
      stats: {
        totalStudents: 0,
        totalAssignments: 0,
        totalGrades: 0,
        avgScore: 0,
        completionRate: 0
      },
      reviewersGrouped: {},
      allGrades: []
    }
  }

  return (
    <ProtectedContent>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
        {/* Header - Server rendered */}
        <header className="bg-white/5 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shadow-lg">
                    <img
                      src="https://res.cloudinary.com/dkuwkpihs/image/upload/v1758759628/web-app-manifest-192x192_dkecn9.png"
                      alt="B4OS Logo"
                      width={40}
                      height={40}
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      B4OS Dashboard
                    </h1>
                    <p className="text-orange-300 text-sm font-medium">
                      Bitcoin 4 Open Source Program
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <LanguageSelector />
                  <UserProfile />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Client Component - receives data as props */}
        <DashboardClient 
          initialData={dashboardData}
          assignments={dashboardData.assignments}
        />
      </div>
    </ProtectedContent>
  )
}
