import { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import { ArrowRightIcon, ClockIcon } from "../Icons"
import { AuthContext } from "../../context/AuthContext"
import { mockApi } from "../../services/mockApi"

function PendingTasks({ filters }) {
  const { currentUser, isAdmin } = useContext(AuthContext)
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const data = await mockApi.fetchPendingTasks(currentUser, isAdmin, filters)
        setTasks(data)
      } catch (error) {
        console.error("Error fetching pending tasks:", error)
        setTasks([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [currentUser, isAdmin, filters])

  if (isLoading) {
    return (
      <div>
        <h3 className="text-xl font-bold mb-4">Pending Tasks</h3>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Pending Tasks</h3>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No pending tasks found.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                    {task.type}
                  </span>
                  <h4 className="font-medium">{task.company}</h4>
                  <p className="text-sm text-slate-500">{task.reference}</p>
                </div>
                <div className="flex items-center text-blue-600 text-sm">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {task.date}
                </div>
              </div>
              <div className="mt-3">
                <Link to={task.link}>
                  <button className="w-full px-4 py-2 text-sm font-medium rounded-md border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    {task.actionText} <ArrowRightIcon className="ml-2 h-3 w-3 inline" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-center">
        <Link to="/dashboard/leads/followup-tracker">
          <button className="text-slate-500 hover:text-slate-700 text-sm font-medium">View all pending tasks</button>
        </Link>
      </div>
    </div>
  )
}

export default PendingTasks

