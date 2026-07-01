import React, { useState } from "react"
import { X, Search, User, UserCheck, Calendar, ClipboardList } from "lucide-react"

export default function TaskDetailsModal({ isOpen, onClose, category, tasks }) {
  const [searchTerm, setSearchTerm] = useState("")

  if (!isOpen) return null

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  // Filter tasks by clicked category
  const categoryTasks = tasks.filter((task) => {
    if (category === "completed") return task.status === "completed"
    if (category === "pending") return task.status === "pending"
    if (category === "overdue") return task.status === "overdue"
    // 'total' represents Analyzed (Total tasks up to today, excluding upcoming tasks)
    if (category === "total") {
      return task.status === "completed" || task.status === "pending" || task.status === "overdue"
    }
    return true
  })

  // Filter tasks based on modal search box
  const filteredTasks = categoryTasks.filter((task) => {
    const query = searchTerm.toLowerCase().trim()
    if (!query) return true
    return (
      (task.title && task.title.toLowerCase().includes(query)) ||
      (task.assignedTo && task.assignedTo.toLowerCase().includes(query)) ||
      (task.given_by && task.given_by.toLowerCase().includes(query)) ||
      (task.id && task.id.toString().includes(query))
    )
  })

  // Get status configuration
  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-green-50 text-green-700 border-green-200",
          label: "Completed",
        }
      case "pending":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Due Today",
        }
      case "overdue":
        return {
          bg: "bg-red-50 text-red-700 border-red-200",
          label: "Overdue",
        }
      default:
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          label: status || "N/A",
        }
    }
  }

  // Get title for the modal based on category
  const getCategoryTitle = () => {
    switch (category) {
      case "completed":
        return "Done Tasks"
      case "pending":
        return "Due Today Tasks"
      case "overdue":
        return "Overdue Tasks"
      case "total":
        return "Analyzed Tasks"
      default:
        return "Tasks"
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div 
        className="fixed inset-0 bg-black/55 backdrop-blur-[6px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden transform transition-all border border-gray-100 z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/50 to-pink-50/30">
          <div>
            <h2 className="text-lg font-black text-purple-900 tracking-wide flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-purple-600" />
              {getCategoryTitle()}
              <span className="ml-2 text-sm font-bold px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                {categoryTasks.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Click outside or press close to exit</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description, doer, or assigner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all placeholder:text-gray-400 text-gray-700 shadow-sm"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs font-bold text-purple-600 hover:text-purple-800 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tasks List container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[250px] bg-gray-50/30">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-sm font-bold text-gray-700">No tasks found</h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                {searchTerm ? "Try adjusting your search query." : "There are no tasks matching this status."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const badge = getStatusBadgeConfig(task.status)
                return (
                  <div 
                    key={task.id} 
                    className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group hover:border-purple-200"
                  >
                    <div>
                      {/* Top Row: ID and Status badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black text-gray-400 tracking-wider">
                          TASK #{task.id}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Title/Description */}
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-relaxed group-hover:text-purple-900 transition-colors">
                        {task.title}
                      </h4>
                    </div>

                    {/* Metadata Row */}
                    <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-[11px] text-gray-500 font-medium">
                      
                      {/* Doer */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Doer</span>
                        <div className="flex items-center gap-1 text-gray-700 min-w-0">
                          <User className="h-3 w-3 text-purple-500 shrink-0" />
                          <span className="truncate">{task.assignedTo}</span>
                        </div>
                      </div>

                      {/* Assign From */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Assign From</span>
                        <div className="flex items-center gap-1 text-gray-700 min-w-0">
                          <UserCheck className="h-3 w-3 text-pink-500 shrink-0" />
                          <span className="truncate">{task.given_by}</span>
                        </div>
                      </div>

                      {/* Planned Date */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Planned Date</span>
                        <div className="flex items-center gap-1 text-gray-700 min-w-0">
                          <Calendar className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{task.taskStartDate || formatDate(task.originalTaskStartDate)}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-700 hover:shadow-md transition-all active:scale-[0.98]"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  )
}
