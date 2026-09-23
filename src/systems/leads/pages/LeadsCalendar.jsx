import { useState, useEffect, useRef, useMemo, useCallback, useContext } from "react"
import { useNavigate } from "react-router-dom"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  X,
  PhoneCall,
  FileText,
  Wallet,
  UserPlus,
  ArrowRight,
  Clock,
  Phone,
  User,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"
import supabase from "../../../SupabaseClient"
import { mockApi } from "../services/mockApi"
import { getLeadReceiverNames } from "../utils/storageManager"
import { AuthContext } from "../context/AuthContext"
import {
  fetchLeadsTatRules,
  calculateLeadsTat,
  LEADS_STAGE_KEYS,
  TatDelayBadge,
} from "../utils/leadsTatEngine"

// Helper to normalize any date format to YYYY-MM-DD
const normalizeDate = (dateVal) => {
  if (!dateVal) return null
  if (typeof dateVal === "string") {
    const isoMatch = dateVal.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoMatch) return isoMatch[1]
    if (dateVal.includes("/")) {
      const parts = dateVal.split("/")
      if (parts.length === 3) {
        return `${parts[2].trim()}-${parts[1].trim().padStart(2, "0")}-${parts[0].trim().padStart(2, "0")}`
      }
    }
  }
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  } catch {
    return null
  }
}

const getHindiDay = (day) => {
  const dayMap = {
    Sunday: "रविवार",
    Monday: "सोमवार",
    Tuesday: "मंगलवार",
    Wednesday: "बुधवार",
    Thursday: "गुरुवार",
    Friday: "शुक्रवार",
    Saturday: "शनिवार",
  }
  return dayMap[day] || day
}

const CATEGORY_CONFIG = {
  followup: {
    label: "Followup Tracker",
    code: "FUP",
    dotColor: "bg-blue-600",
    badgeBg: "bg-blue-50 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    badgeBorder: "border-blue-200 dark:border-blue-800",
    pillBorder: "border-l-blue-600",
    icon: PhoneCall,
  },
  pending_quotation: {
    label: "Pending Quotation",
    code: "PQ",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-200 dark:border-amber-800",
    pillBorder: "border-l-amber-500",
    icon: FileText,
  },
  quotation_tracker: {
    label: "Quotation Tracker",
    code: "QT",
    dotColor: "bg-purple-600",
    badgeBg: "bg-purple-50 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-200 dark:border-purple-800",
    pillBorder: "border-l-purple-600",
    icon: Wallet,
  },
}

export default function LeadsCalendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [leadEvents, setLeadEvents] = useState([])
  const [holidays, setHolidays] = useState([])
  const [workingDays, setWorkingDays] = useState([])
  const [loading, setLoading] = useState(true)

  const { currentUser, isAdmin, isSalesPerson } = useContext(AuthContext)
  const isUserSalesPerson = isSalesPerson || (!isAdmin())

  // Filters
  const [allPersons, setAllPersons] = useState([])
  const [selectedPersons, setSelectedPersons] = useState(
    isUserSalesPerson && currentUser?.username ? [currentUser.username] : []
  )
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showPersonFilter, setShowPersonFilter] = useState(false)
  const filterRef = useRef(null)

  useEffect(() => {
    if (isUserSalesPerson && currentUser?.username) {
      setSelectedPersons([currentUser.username])
    }
  }, [isUserSalesPerson, currentUser])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDateStr, setSelectedDateStr] = useState(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState([])
  const [modalHoliday, setModalHoliday] = useState(null)
  const [modalIsOffDay, setModalIsOffDay] = useState(false)
  const [modalTab, setModalTab] = useState("all")

  // Close person filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowPersonFilter(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Load team members / sales persons
  const loadPersons = useCallback(() => {
    try {
      const stored = getLeadReceiverNames().map((p) => (typeof p === "string" ? p : p.name)).filter(Boolean)
      setAllPersons(Array.from(new Set(stored)))
    } catch {
      setAllPersons(["Shadab", "Sajit", "Musaib", "Faizan", "Rajesh Kumar", "Priya Sharma"])
    }
  }, [])

  // Load all leads, follow-ups, pending quotations, quotation tracker items, holidays, working days
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true)

      const storedUsername = localStorage.getItem("user-name") || "Admin"
      const storedRole = (localStorage.getItem("role") || "admin").toLowerCase()
      const currentUser = { username: storedUsername, userType: storedRole }
      const isAdminFunc = () =>
        storedRole === "admin" ||
        storedRole === "administrator" ||
        storedRole === "superadmin" ||
        storedRole === "hod"

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
      const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, "0")}-01`
      const endStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}T23:59:59`

      const [
        followUpsRes,
        quotationLeadsRes,
        advancePaymentsRes,
        tatRulesRes,
        holidaysRes,
        workingDaysRes
      ] = await Promise.allSettled([
        mockApi.fetchFollowUps(currentUser, isAdminFunc),
        mockApi.fetchCallTrackerLeads(),
        mockApi.fetchAdvancePayments(),
        fetchLeadsTatRules(),
        supabase.from("holidays").select("*"),
        supabase.from("working_day_calender").select("working_date").gte("working_date", startStr).lte("working_date", endStr),
      ])

      const rules = tatRulesRes.status === "fulfilled" && Array.isArray(tatRulesRes.value) ? tatRulesRes.value : []

      const holidaysList = holidaysRes.status === "fulfilled" && Array.isArray(holidaysRes.value?.data) ? holidaysRes.value.data : []
      setHolidays(holidaysList)

      const workingDaysList = workingDaysRes.status === "fulfilled" && Array.isArray(workingDaysRes.value?.data) ? workingDaysRes.value.data : []
      setWorkingDays(workingDaysList)

      const normalizedEvents = []

      // 1. Followup Tracker Items (Pending follow-ups)
      const pendingFollowUps = followUpsRes.status === "fulfilled" ? (followUpsRes.value?.pending || []) : []
      pendingFollowUps.forEach((item, idx) => {
        const tatInfo = calculateLeadsTat(item, LEADS_STAGE_KEYS.FOLLOWUP_TRACKER, rules)
        const plannedDate = tatInfo?.plannedDate || item.nextCallDate || item.plannedDate || item.date
        const normalized = normalizeDate(plannedDate)
        if (normalized) {
          normalizedEvents.push({
            id: `fup-${item.leadNo || idx}-${idx}`,
            type: "followup",
            category: "followup",
            date: normalized,
            time: item.nextCallTime || item.time || (tatInfo?.plannedFormatted ? tatInfo.plannedFormatted.split(" ")[1] : "10:00 AM"),
            leadNo: item.leadNo || item.leadNumber || "-",
            companyName: item.companyName || item.customerName || "Unnamed Company",
            contactName: item.personName || item.contactPerson || item.contactName || "",
            contactNo: item.contactNumber || item.phoneNumber || item.contactNo || "",
            salesPerson: item.receiverName || item.salesPerson || "",
            nob: item.nob || item.natureOfBusiness || "",
            division: item.division || item.consigneeDivision || "",
            status: item.status || "Pending Followup",
            remarks: item.remarks || item.customerSaid || "",
            tatInfo,
            raw: item,
            actionRoute: `/dashboard/leads/followup-tracker`,
            actionLabel: "Open Followup Tracker",
          })
        }
      })

      // 2. Pending Quotation Items
      const pendingQuotations = quotationLeadsRes.status === "fulfilled" && Array.isArray(quotationLeadsRes.value) ? quotationLeadsRes.value : []
      pendingQuotations.forEach((item, idx) => {
        const tatInfo = calculateLeadsTat(item, LEADS_STAGE_KEYS.PENDING_QUOTATION, rules)
        const plannedDate = tatInfo?.plannedDate || item.plannedDate || item.date || item.quotationDate || item.created_at
        const normalized = normalizeDate(plannedDate)
        if (normalized) {
          normalizedEvents.push({
            id: `pq-${item.leadNo || idx}-${idx}`,
            type: "pending_quotation",
            category: "pending_quotation",
            date: normalized,
            time: tatInfo?.plannedFormatted ? tatInfo.plannedFormatted.split(" ")[1] : "12:00 PM",
            leadNo: item.leadNo || "-",
            companyName: item.companyName || "Unnamed Company",
            contactName: item.contactName || item.contactPerson || "",
            contactNo: item.contactNo || item.contactNumber || "",
            salesPerson: item.salesPerson || item.receiverName || "",
            nob: item.nob || "",
            division: item.division || "",
            status: "Pending Quotation",
            remarks: item.remarks || "Quotation generation pending",
            tatInfo,
            raw: item,
            actionRoute: `/dashboard/leads/pending-quotation`,
            actionLabel: "Create Quotation",
          })
        }
      })

      // 3. Quotation Tracker Items (Advance / Order follow-up)
      const pendingAdvances = advancePaymentsRes.status === "fulfilled" ? (advancePaymentsRes.value?.pending || []) : []
      pendingAdvances.forEach((item, idx) => {
        const tatInfo = calculateLeadsTat(item, LEADS_STAGE_KEYS.QUOTATION_TRACKER, rules)
        const plannedDate = tatInfo?.plannedDate || item.nextFollowup || item.nextFollowupDate || item.date || item.updatedAt
        const normalized = normalizeDate(plannedDate)
        if (normalized) {
          normalizedEvents.push({
            id: `qt-${item.quotationNo || item.leadNo || idx}-${idx}`,
            type: "quotation_tracker",
            category: "quotation_tracker",
            date: normalized,
            time: item.time || (tatInfo?.plannedFormatted ? tatInfo.plannedFormatted.split(" ")[1] : "02:00 PM"),
            leadNo: item.leadNo || item.quotationNo || "-",
            quotationNo: item.quotationNo || item.poNumber || "-",
            companyName: item.companyName || item.consigneeName || "Unnamed Company",
            contactName: item.contactName || item.contactPerson || "",
            contactNo: item.contactNo || item.contactNumber || "",
            salesPerson: item.salesPerson || item.receiverName || "",
            nob: item.nob || "",
            division: item.division || "",
            status: item.status || "Quotation Tracker",
            remarks: item.customerSaid || item.remarks || "",
            tatInfo,
            raw: item,
            actionRoute: `/dashboard/leads/quotation-tracker`,
            actionLabel: "Open Quotation Tracker",
          })
        }
      })

      setLeadEvents(normalizedEvents)
    } catch (err) {
      console.error("Error loading leads calendar data:", err)
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    loadPersons()
    loadCalendarData()
  }, [loadPersons, loadCalendarData])

  // Filtered Events based on search, person, and category
  const filteredEvents = useMemo(() => {
    return leadEvents.filter((event) => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matches =
          (event.leadNo && event.leadNo.toLowerCase().includes(q)) ||
          (event.quotationNo && event.quotationNo.toLowerCase().includes(q)) ||
          (event.companyName && event.companyName.toLowerCase().includes(q)) ||
          (event.salesPerson && event.salesPerson.toLowerCase().includes(q)) ||
          (event.nob && event.nob.toLowerCase().includes(q)) ||
          (event.division && event.division.toLowerCase().includes(q))
        if (!matches) return false
      }

      // Person filter
      if (selectedPersons.length > 0) {
        if (!selectedPersons.includes(event.salesPerson)) return false
      }

      // Category filter
      if (selectedCategory !== "all") {
        if (event.category !== selectedCategory) return false
      }

      return true
    })
  }, [leadEvents, searchTerm, selectedPersons, selectedCategory])

  const togglePerson = (name) => {
    setSelectedPersons((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  const clearFilters = () => {
    setSelectedPersons(isUserSalesPerson && currentUser?.username ? [currentUser.username] : [])
    setSelectedCategory("all")
    setSearchTerm("")
  }

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthName = currentDate.toLocaleString("default", { month: "long" })

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay()

  const totalDays = daysInMonth(year, month)
  const startDay = firstDayOfMonth(year, month)

  // Handle click on calendar cell
  const handleCellClick = (day, holiday, isOffDay) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dayEvents = filteredEvents.filter((e) => e.date === dateStr)

    setSelectedDateStr(dateStr)
    setSelectedDayEvents(dayEvents)
    setModalHoliday(holiday || null)
    setModalIsOffDay(isOffDay)
    setModalTab("all")
    setIsModalOpen(true)
  }

  // Filtered items inside modal tab
  const modalFilteredEvents = useMemo(() => {
    if (modalTab === "all") return selectedDayEvents
    return selectedDayEvents.filter((e) => e.category === modalTab)
  }, [selectedDayEvents, modalTab])

  // Count summaries for the active month
  const monthSummary = useMemo(() => {
    const counts = { followup: 0, pending_quotation: 0, quotation_tracker: 0, total: 0 }
    filteredEvents.forEach((e) => {
      if (counts[e.category] !== undefined) counts[e.category]++
      counts.total++
    })
    return counts
  }, [filteredEvents])

  // Build grid days
  const calendarCells = []

  // Empty cells for padding before month start
  for (let i = 0; i < startDay; i++) {
    calendarCells.push(
      <div
        key={`empty-${i}`}
        className="aspect-square bg-gray-50/70 dark:bg-slate-900/40 border-r border-b border-gray-150 dark:border-slate-800"
      />
    )
  }

  // Days of the month
  for (let i = 1; i <= totalDays; i++) {
    const dayDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`
    const holiday = holidays.find((h) => normalizeDate(h.holiday_date) === dayDate)
    const workingDay = workingDays.find((w) => normalizeDate(w.working_date) === dayDate)
    const dayEvents = filteredEvents.filter((e) => e.date === dayDate)
    const isToday = new Date().toISOString().split("T")[0] === dayDate
    const isHoliday = !!holiday
    const isOffDay = !isHoliday && !workingDay && workingDays.length > 0

    // Unique categories present on this day
    const dayCategories = Array.from(new Set(dayEvents.map((e) => e.category)))

    calendarCells.push(
      <div
        key={i}
        onClick={() => handleCellClick(i, holiday, isOffDay)}
        className={`aspect-square border-r border-b border-gray-150 dark:border-slate-800 p-2 cursor-pointer transition-all duration-200 relative group select-none ${
          isHoliday
            ? "bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100/70 dark:hover:bg-rose-950/30"
            : isOffDay
            ? "bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
            : isToday
            ? "bg-blue-50/50 dark:bg-blue-950/25 ring-2 ring-blue-500/40 z-10 hover:bg-blue-100/50"
            : "bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-slate-800/60"
        }`}
      >
        {/* Cell Header: Day Number & Dots */}
        <div className="flex justify-between items-start mb-1">
          <span
            className={`text-xs font-black inline-flex items-center justify-center rounded-lg ${
              isToday
                ? "bg-blue-600 text-white w-6 h-6 shadow-xs"
                : isHoliday
                ? "text-rose-600 dark:text-rose-400 font-black"
                : isOffDay
                ? "text-gray-400 dark:text-slate-500"
                : "text-gray-800 dark:text-slate-200"
            }`}
          >
            {i}
          </span>

          {dayEvents.length > 0 && (
            <div className="flex items-center gap-1">
              {dayCategories.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat]
                return (
                  <div
                    key={cat}
                    className={`w-2 h-2 rounded-full ${cfg ? cfg.dotColor : "bg-gray-400"}`}
                    title={cfg ? cfg.label : cat}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Cell Content */}
        <div className="space-y-1 mt-1 overflow-hidden h-[calc(100%-1.8rem)] flex flex-col justify-start">
          {isHoliday && (
            <p className="text-[9px] font-black text-rose-600 dark:text-rose-300 uppercase leading-tight truncate px-1.5 py-0.5 bg-rose-100/70 dark:bg-rose-950/60 rounded border border-rose-200 dark:border-rose-900">
              {holiday.holiday_name}
            </p>
          )}

          {isOffDay && (
            <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase leading-tight truncate px-1 bg-gray-100 dark:bg-slate-800 rounded">
              Off Day
            </p>
          )}

          {dayEvents.slice(0, 3).map((event) => {
            const cfg = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.followup
            return (
              <div
                key={event.id}
                className={`bg-gray-50 dark:bg-slate-800/90 border-l-2 ${cfg.pillBorder} pl-1.5 pr-1 py-0.5 rounded-r shadow-2xs group-hover:shadow-xs transition-shadow`}
              >
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[9px] font-bold text-gray-800 dark:text-slate-200 truncate leading-snug">
                    {event.companyName}
                  </p>
                  <span className="text-[8px] font-extrabold text-gray-400 dark:text-slate-500 shrink-0">
                    {event.time}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-gray-500 dark:text-slate-400 truncate">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{event.leadNo}</span>
                  {event.salesPerson && <span>• {event.salesPerson}</span>}
                </div>
              </div>
            )
          })}

          {dayEvents.length > 3 && (
            <div className="pt-0.5">
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                + {dayEvents.length - 3} More
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5 py-2 md:py-4 theme-transition">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-sm">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Leads Calendar
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {monthSummary.total} Total
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
              Scheduled Followup Tracker calls, Pending Quotation deadlines, and Quotation Tracker milestones
            </p>
          </div>
        </div>

        {/* Action Controls & Stepper */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Refresh Button */}
          <button
            onClick={loadCalendarData}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Refresh Leads Calendar"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>

          {/* Filter Person Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowPersonFilter(!showPersonFilter)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                selectedPersons.length > 0
                  ? "bg-blue-600 border-blue-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <Users size={14} />
              <span>
                {selectedPersons.length > 0
                  ? `${selectedPersons.length} Selected`
                  : "Filter Person"}
              </span>
            </button>

            {showPersonFilter && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 text-gray-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search team member..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                  {allPersons
                    .filter((p) => !searchTerm || p.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((person) => {
                      const isSelected = selectedPersons.includes(person)
                      return (
                        <div
                          key={person}
                          onClick={() => togglePerson(person)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                              : "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50"
                          }`}
                        >
                          <span>{person}</span>
                          {isSelected && <CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400" />}
                        </div>
                      )
                    })}
                </div>

                {selectedPersons.length > 0 && (
                  <div className="p-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 flex justify-between">
                    <button
                      onClick={() => setSelectedPersons([])}
                      className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline px-2 py-1"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowPersonFilter(false)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Category Dropdown */}
          <div className="min-w-[150px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
            >
              <option value="all">All Stages</option>
              <option value="followup">Followup Tracker ({monthSummary.followup})</option>
              <option value="pending_quotation">Pending Quotation ({monthSummary.pending_quotation})</option>
              <option value="quotation_tracker">Quotation Tracker ({monthSummary.quotation_tracker})</option>
            </select>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xs overflow-hidden">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={goToToday}
              className="px-3.5 py-1.5 text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Click to go to Today"
            >
              {monthName} {year}
            </button>

            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend Bar & Quick Metrics */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
              Legend:
            </span>

            <div
              onClick={() => setSelectedCategory(selectedCategory === "followup" ? "all" : "followup")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                selectedCategory === "followup" ? "bg-blue-100/70 dark:bg-blue-950/60 font-bold" : "hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="font-semibold text-gray-700 dark:text-slate-300">Followup Tracker</span>
              <span className="text-[10px] font-bold text-blue-600">({monthSummary.followup})</span>
            </div>

            <div
              onClick={() => setSelectedCategory(selectedCategory === "pending_quotation" ? "all" : "pending_quotation")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                selectedCategory === "pending_quotation" ? "bg-amber-100/70 dark:bg-amber-950/60 font-bold" : "hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-gray-700 dark:text-slate-300">Pending Quotation</span>
              <span className="text-[10px] font-bold text-amber-600">({monthSummary.pending_quotation})</span>
            </div>

            <div
              onClick={() => setSelectedCategory(selectedCategory === "quotation_tracker" ? "all" : "quotation_tracker")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                selectedCategory === "quotation_tracker" ? "bg-purple-100/70 dark:bg-purple-950/60 font-bold" : "hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span className="font-semibold text-gray-700 dark:text-slate-300">Quotation Tracker</span>
              <span className="text-[10px] font-bold text-purple-600">({monthSummary.quotation_tracker})</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span className="font-semibold text-gray-700 dark:text-slate-300">Holiday</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="font-semibold text-gray-700 dark:text-slate-300">Off Day</span>
            </div>
          </div>

          {(selectedPersons.length > 0 || selectedCategory !== "all" || searchTerm) && (
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Calendar Grid Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-20 text-center">
            <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600" />
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-4">Loading Leads Calendar...</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Day Headers (Hindi + English) */}
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                  <div key={d} className="p-3 text-center border-r border-gray-150 dark:border-slate-800 last:border-r-0">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                      {getHindiDay(d)}
                    </p>
                    <p className="text-xs font-black text-gray-800 dark:text-slate-200 uppercase tracking-wider mt-0.5">
                      {d}
                    </p>
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 border-l border-t border-gray-150 dark:border-slate-800">
                {calendarCells}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-150 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    {selectedDateStr ? new Date(selectedDateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Scheduled Leads"}
                  </h3>
                  {modalHoliday && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-md">
                      {modalHoliday.holiday_name}
                    </span>
                  )}
                  {modalIsOffDay && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 rounded-md">
                      Off Day
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
                  {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "lead event" : "lead events"} scheduled on this date
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Filter Tabs */}
            <div className="px-5 pt-3 pb-2 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setModalTab("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  modalTab === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                All ({selectedDayEvents.length})
              </button>
              <button
                onClick={() => setModalTab("followup")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  modalTab === "followup"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Followup Tracker ({selectedDayEvents.filter((e) => e.category === "followup").length})
              </button>
              <button
                onClick={() => setModalTab("pending_quotation")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  modalTab === "pending_quotation"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Pending Quotation ({selectedDayEvents.filter((e) => e.category === "pending_quotation").length})
              </button>
              <button
                onClick={() => setModalTab("quotation_tracker")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  modalTab === "quotation_tracker"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Quotation Tracker ({selectedDayEvents.filter((e) => e.category === "quotation_tracker").length})
              </button>
            </div>

            {/* Modal Events List */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {modalFilteredEvents.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 mb-3">
                    <CalendarIcon size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">No events found for this filter</h4>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    There are no scheduled activities matching the selected tab on this date.
                  </p>
                </div>
              ) : (
                modalFilteredEvents.map((event) => {
                  const cfg = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.followup
                  return (
                    <div
                      key={event.id}
                      className="bg-white dark:bg-slate-800/90 border border-gray-150 dark:border-slate-700 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
                    >
                      {/* Top row: Stage badge, Lead No, Time */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
                          >
                            <cfg.icon size={13} />
                            {cfg.label}
                          </span>
                          <span className="font-black text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                            {event.leadNo}
                          </span>
                          {event.quotationNo && (
                            <span className="font-bold text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                              {event.quotationNo}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {event.tatInfo && <TatDelayBadge tat={event.tatInfo} />}
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                            <Clock size={12} />
                            {event.time}
                          </span>
                        </div>
                      </div>

                      {/* Middle row: Company Name, Contact, NOB */}
                      <div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white">
                          {event.companyName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600 dark:text-slate-300">
                          {event.contactName && (
                            <span className="flex items-center gap-1">
                              <User size={12} className="text-gray-400" />
                              {event.contactName}
                            </span>
                          )}
                          {event.contactNo && (
                            <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
                              <Phone size={12} className="text-gray-400" />
                              {event.contactNo}
                            </span>
                          )}
                          {event.salesPerson && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                              <Users size={12} />
                              Assigned: {event.salesPerson}
                            </span>
                          )}
                          {event.nob && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              {event.nob}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Remarks / Discussion */}
                      {event.remarks && (
                        <div className="p-2.5 bg-gray-50 dark:bg-slate-900/60 rounded-xl text-xs text-gray-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                          <span className="font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">
                            Discussion / Notes:
                          </span>
                          <p className="line-clamp-2">{event.remarks}</p>
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setIsModalOpen(false)
                            navigate(event.actionRoute)
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs hover:shadow-md cursor-pointer"
                        >
                          <span>{event.actionLabel}</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-150 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/50 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  navigate("/dashboard/leads/new-lead")
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                <UserPlus size={14} />
                <span>Add New Lead</span>
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
