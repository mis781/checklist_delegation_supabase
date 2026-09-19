import { useState, useEffect, useContext } from "react"
import { AuthContext } from "../../context/AuthContext"
import { mockApi } from "../../services/mockApi"

function RecentActivities({ filters }) {
  const { currentUser, isAdmin } = useContext(AuthContext)
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true)
        const data = await mockApi.fetchRecentActivities(currentUser, isAdmin, filters)
        setActivities(data)
      } catch (error) {
        console.error("Error fetching recent activities:", error)
        setActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [currentUser, isAdmin, filters])

  if (isLoading) {
    return (
      <div>
        <h3 className="text-xl font-bold mb-4">Recent Activities</h3>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Recent Activities</h3>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No recent activities found.
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 border-b border-slate-200 last:border-0">
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-medium">
                {activity.user ? activity.user.charAt(0).toUpperCase() : 'S'}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
                <p className="text-sm text-slate-600">{activity.action}</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(activity.type)}`}
                  >
                    {activity.type}
                  </span>
                  <span className="text-xs text-slate-500">{activity.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getBadgeColor(type) {
  switch (type) {
    case "Lead":
      return "bg-blue-100 text-blue-800"
    case "Follow-up":
      return "bg-blue-100 text-blue-800"
    case "Quotation":
      return "bg-sky-100 text-sky-800"
    case "Order":
      return "bg-emerald-100 text-emerald-800"
    default:
      return "bg-slate-100 text-slate-800"
  }
}

export default RecentActivities
