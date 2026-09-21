"use client"

import { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import { PhoneCall } from "lucide-react"
import { SearchIcon, ArrowRightIcon } from "../components/Icons"
import { AuthContext } from "../context/AuthContext" // Import AuthContext
import { mockApi } from "../services/mockApi"
import DataTable from "../components/DataTable"
import {
  fetchLeadsTatRules,
  calculateLeadsTat,
  LEADS_STAGE_KEYS,
  TatDelayBadge,
} from "../utils/leadsTatEngine"

const slideIn = "animate-in slide-in-from-right duration-300"
const slideOut = "animate-out slide-out-to-right duration-300"
const fadeIn = "animate-in fade-in duration-300"
const fadeOut = "animate-out fade-out duration-300"

function FollowupTracker() {
  const { currentUser, userType, isAdmin } = useContext(AuthContext) // Get user info and admin function
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [pendingFollowUps, setPendingFollowUps] = useState([])
  const [historyFollowUps, setHistoryFollowUps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [dateFilter, setDateFilter] = useState("all") // New state for date filter
  const [showPopup, setShowPopup] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState(null)
  const [companyFilter, setCompanyFilter] = useState("all")
  const [personFilter, setPersonFilter] = useState("all")
  const [nobFilter, setNobFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    leadNo: true,
    followUpNo: true,
    companyName: true,
    division: true,
    customerSay: true,
    notInterestedReason: true,
    status: true,
    enquiryStatus: true,
    receivedDate: true,
    state: true,
    projectName: true,
    salesType: true,
    productDate: true,
    projectValue: true,
    item1: true,
    qty1: true,
    item2: true,
    qty2: true,
    item3: true,
    qty3: true,
    item4: true,
    qty4: true,
    item5: true,
    qty5: true,
    nextAction: true,
    nextCallDateTime: true,
    itemQty: true, // Add this line
  })
  // Column visibility for the Pending table — all columns shown by default.
  const [pendingVisibleColumns, setPendingVisibleColumns] = useState({
    plannedDate: true,
    delay: true,
    companyName: true,
    salesPersonName: true,
    followUpCount: true,
    salesType: true,
    interaction: true,
    leadSource: true,
    leadType: true,
    division: true,
    nob: true,
    email: true,
    state: true,
    city: true,
    address: true,
    contactPersonName: true,
    designation: true,
    phoneNumber: true,
    customerSay: true,
    nextAction: true,
    nextCallDateTime: true,
    notes: true,
    attachment: true,
  })
  const [tatRules, setTatRules] = useState([])
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Helper function to determine priority based on lead source
  const determinePriority = (source) => {
    if (!source) return "Low"

    const sourceLower = source.toLowerCase()
    if (sourceLower.includes("indiamart")) return "High"
    if (sourceLower.includes("website")) return "Medium"
    return "Low"
  }

  // Helper function to format next call time
  const formatNextCallTime = (timeValue) => {
    if (!timeValue) return ""

    try {
      // Check if it's a Date(YYYY,MM,DD,HH,MM,SS) format
      if (typeof timeValue === "string" && timeValue.startsWith("Date(")) {
        // Extract hours and minutes from the Date string
        const timeString = timeValue.substring(5, timeValue.length - 1)
        const [year, month, day, hours, minutes, seconds] = timeString
          .split(",")
          .map((part) => Number.parseInt(part.trim()))

        // Convert to 12-hour format
        const formattedHours = hours % 12 || 12 // Convert to 12-hour format
        const period = hours >= 12 ? "PM" : "AM"

        // Pad minutes with leading zero if needed
        const formattedMinutes = minutes.toString().padStart(2, "0")

        return `${formattedHours}:${formattedMinutes} ${period}`
      }

      // If it's already in HH:MM:SS format
      if (typeof timeValue === "string" && /^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
        const [hours, minutes] = timeValue.split(":").map(Number)

        // Convert to 12-hour format
        const formattedHours = hours % 12 || 12
        const period = hours >= 12 ? "PM" : "AM"

        // Pad minutes with leading zero if needed
        const formattedMinutes = minutes.toString().padStart(2, "0")

        return `${formattedHours}:${formattedMinutes} ${period}`
      }

      // Fallback to original value if parsing fails
      return timeValue
    } catch (error) {
      console.error("Error formatting time:", error)
      return timeValue
    }
  }

  // Helper function to calculate next call date (3 days after created date)
  const calculateNextCallDate = (createdDate) => {
    if (!createdDate) return ""

    try {
      // Parse the date - assuming format is DD/MM/YYYY
      const parts = createdDate.split("/")
      if (parts.length !== 3) return ""

      const date = new Date(parts[2], parts[1] - 1, parts[0])
      date.setDate(date.getDate() + 3) // Add 3 days for next call

      // Format as YYYY-MM-DD for display
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    } catch (error) {
      console.error("Error calculating next call date:", error)
      return ""
    }
  }

  // Helper function to format date to DD/MM/YYYY
  const formatDateToDDMMYYYY = (dateValue) => {
    if (!dateValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,3,22)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD) format
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))

        // JavaScript months are 0-indexed, but we need to display them as 1-indexed
        // Also ensure day and month are padded with leading zeros if needed
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }

      // Handle other date formats if needed
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      }

      // If it's already in the correct format, return as is
      return dateValue
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  // Helper function to parse date from column CL and compare with today
  const getDateFromColumnCL = (dateValue) => {
    if (!dateValue) return null

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,4,27)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))
        // JavaScript months are 0-indexed
        return new Date(year, month, day)
      }

      // Try to parse as regular date
      const parsedDate = new Date(dateValue)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }

      return null
    } catch (error) {
      console.error("Error parsing date from column CL:", error)
      return null
    }
  }

  // Add this helper function after the other helper functions (around line 100)
  const formatItemQty = (itemQtyString) => {
    if (!itemQtyString) return ""

    try {
      const items = JSON.parse(itemQtyString)
      return items
        .filter(item => item.name && item.quantity && item.quantity !== "0")
        .map(item => `${item.name} : ${item.quantity}`)
        .join(", ")
    } catch (error) {
      console.error("Error parsing item quantity:", error)
      return itemQtyString // Return original string if parsing fails
    }
  }

  // Combines the separate Next Call Date/Time fields into a single readable
  // value for display, e.g. "15/08/2026, 02:30 PM".
  const formatNextCallDateTime = (nextCallDate, nextCallTime) => {
    if (!nextCallDate && !nextCallTime) return "-"
    if (!nextCallTime) return nextCallDate

    const [hourStr, minuteStr] = nextCallTime.split(":")
    const hour = parseInt(hourStr, 10)
    const period = hour >= 12 ? "PM" : "AM"
    const hour12 = ((hour + 11) % 12) + 1
    const formattedTime = `${String(hour12).padStart(2, "0")}:${minuteStr} ${period}`

    return nextCallDate ? `${nextCallDate}, ${formattedTime}` : formattedTime
  }

  // Helper function to check date filter condition
  // Helper function to check date filter condition
  const checkDateFilter = (followUp, filterType) => {
    if (filterType === "all") return true

    if (activeTab === "pending") {
      // Get the text value from column CL (nextCallDate field)
      const columnCLValue = followUp.nextCallDate
      if (!columnCLValue) return false

      // Convert the column CL value to lowercase for comparison
      const columnCLText = String(columnCLValue).toLowerCase()

      // Match the filter type with the text in column CL
      switch (filterType) {
        case "today":
          return columnCLText.includes("today")
        case "overdue":
          return columnCLText.includes("overdue")
        case "upcoming":
          return columnCLText.includes("upcoming")
        default:
          return true
      }
    } else {
      // History tab filtering
      const nextCallDate = followUp.nextCallDate
      if (!nextCallDate) return false

      try {
        // Parse the date from DD/MM/YYYY format
        const [day, month, year] = nextCallDate.split("/")
        const followUpDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        switch (filterType) {
          case "today":
            return (
              followUpDate.getDate() === today.getDate() &&
              followUpDate.getMonth() === today.getMonth() &&
              followUpDate.getFullYear() === today.getFullYear()
            )
          case "older":
            return followUpDate < today
          default:
            return true
        }
      } catch (error) {
        console.error("Error parsing date:", error)
        return false
      }
    }
  }

  // Function to fetch data from FMS and Leads Tracker sheets
  useEffect(() => {
    const fetchFollowUpData = async () => {
      try {
        setIsLoading(true)

        const data = await mockApi.fetchFollowUps(currentUser, isAdmin)

        setPendingFollowUps(data.pending)
        setHistoryFollowUps(data.history)

      } catch (error) {
        console.error("Error fetching follow-up data:", error)
        // Fallback or empty state
        setPendingFollowUps([])
        setHistoryFollowUps([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFollowUpData()

    // Fetch TAT SLA rules for Leads System
    fetchLeadsTatRules().then((rules) => {
      if (rules && rules.length > 0) {
        setTatRules(rules)
      }
    })

    const handleLeadsUpdated = () => {
      fetchFollowUpData()
      fetchLeadsTatRules().then((rules) => {
        if (rules && rules.length > 0) {
          setTatRules(rules)
        }
      })
    }
    window.addEventListener("leads-updated", handleLeadsUpdated)
    return () => window.removeEventListener("leads-updated", handleLeadsUpdated)
  }, [currentUser, isAdmin]) // Add isAdmin to dependencies

  // Add this function or modify the existing formatDateToDDMMYYYY function
  const formatPopupDate = (dateValue) => {
    if (!dateValue) return ""

    try {
      // Check if it's a Date object-like string (e.g. "Date(2025,4,3)")
      if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
        // Extract the parts from Date(YYYY,MM,DD) format
        const dateString = dateValue.substring(5, dateValue.length - 1)
        const [year, month, day] = dateString.split(",").map((part) => Number.parseInt(part.trim()))

        // JavaScript months are 0-indexed, but we need to display them as 1-indexed
        // Also ensure day and month are padded with leading zeros if needed
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }

      // If it's already in the correct format, return as is
      return dateValue
    } catch (error) {
      console.error("Error formatting popup date:", error)
      return dateValue // Return the original value if formatting fails
    }
  }

  // Filter function for search in both sections. Pending has no search box
  // (see the input above, only rendered for History), so it always matches
  // here — otherwise a term typed while on History would keep silently
  // filtering Pending after switching tabs, with no visible box to explain it.
  const filteredPendingFollowUps = pendingFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      activeTab !== "history" ||
      searchTerm === "" ||
      (followUp.companyName && followUp.companyName.toLowerCase().includes(searchLower)) ||
      (followUp.leadId && followUp.leadId.toLowerCase().includes(searchLower)) ||
      (followUp.personName && followUp.personName.toLowerCase().includes(searchLower)) ||
      (followUp.phoneNumber && followUp.phoneNumber.toString().toLowerCase().includes(searchLower)) ||
      (followUp.leadSource && followUp.leadSource.toLowerCase().includes(searchLower)) ||
      (followUp.location && followUp.location.toLowerCase().includes(searchLower)) ||
      (followUp.customerSay && followUp.customerSay.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryStatus && followUp.enquiryStatus.toLowerCase().includes(searchLower)) ||
      (followUp.assignedTo && followUp.assignedTo.toLowerCase().includes(searchLower))

    // Apply filter type. Every pending row's enquiryStatus is hardcoded to
    // "New" (see mockApi.js) regardless of follow-up history, so it can't
    // tell a fresh lead apart from one already scheduled for a call back —
    // whether a follow-up has ever been logged is only reflected in
    // nextAction/nextCallDate (set once an "Expected" outcome is recorded).
    const hasBeenFollowedUp = !!(followUp.nextAction || followUp.nextCallDate)
    const matchesFilterType = (() => {
      if (filterType === "first") {
        return !hasBeenFollowedUp
      } else if (filterType === "multi") {
        return hasBeenFollowedUp
      } else {
        return true
      }
    })()

    // Apply date filter based on column CL
    const matchesDateFilter = checkDateFilter(followUp, dateFilter)

    // Apply company filter
    const matchesCompanyFilter = companyFilter === "all" || followUp.companyName === companyFilter

    // Apply person filter (matches the "Sales Person Name" column, i.e.
    // who raised/owns the lead — not the company's contact person)
    const matchesPersonFilter = personFilter === "all" || followUp.receiverName === personFilter

    // Apply NOB filter
    const matchesNobFilter = nobFilter === "all" || followUp.nob === nobFilter

    return (
      matchesSearch &&
      matchesFilterType &&
      matchesDateFilter &&
      matchesCompanyFilter &&
      matchesPersonFilter &&
      matchesNobFilter
    )
  })

  useEffect(() => {
    // Company/Person/NOB filter options are sourced from whichever tab's
    // dataset is active, so reset the selections on every tab switch —
    // otherwise a value picked in one tab could silently not match anything
    // in the other.
    setCurrentPage(1)
    setCompanyFilter("all")
    setPersonFilter("all")
    setNobFilter("all")
  }, [activeTab])

  const filteredHistoryFollowUps = historyFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      (followUp.leadNo && followUp.leadNo.toString().toLowerCase().includes(searchLower)) ||
      (followUp.customerSay && followUp.customerSay.toLowerCase().includes(searchLower)) ||
      (followUp.status && followUp.status.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedStatus && followUp.enquiryReceivedStatus.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedDate && followUp.enquiryReceivedDate.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryState && followUp.enquiryState.toLowerCase().includes(searchLower)) ||
      (followUp.projectName && followUp.projectName.toLowerCase().includes(searchLower)) ||
      (followUp.salesType && followUp.salesType.toLowerCase().includes(searchLower)) ||
      (followUp.requiredProductDate && followUp.requiredProductDate.toLowerCase().includes(searchLower)) ||
      (followUp.projectApproxValue && followUp.projectApproxValue.toString().toLowerCase().includes(searchLower)) ||
      (followUp.itemName1 && followUp.itemName1.toLowerCase().includes(searchLower)) ||
      (followUp.itemName2 && followUp.itemName2.toLowerCase().includes(searchLower)) ||
      (followUp.itemName3 && followUp.itemName3.toLowerCase().includes(searchLower)) ||
      (followUp.itemName4 && followUp.itemName4.toLowerCase().includes(searchLower)) ||
      (followUp.itemName5 && followUp.itemName5.toLowerCase().includes(searchLower)) ||
      (followUp.nextAction && followUp.nextAction.toLowerCase().includes(searchLower)) ||
      (followUp.nextCallDate && followUp.nextCallDate.toLowerCase().includes(searchLower)) ||
      (followUp.nextCallTime && followUp.nextCallTime.toLowerCase().includes(searchLower))

    // Apply filter type for history - check column E (enquiryReceivedStatus)
    const matchesFilterType = (() => {
      if (filterType === "first") {
        return (
          followUp.enquiryReceivedStatus === "" ||
          followUp.enquiryReceivedStatus === null ||
          followUp.enquiryReceivedStatus === "New"
        )
      } else if (filterType === "multi") {
        return followUp.enquiryReceivedStatus === "Expected" || followUp.enquiryReceivedStatus === "expected"
      } else {
        return true
      }
    })()

    // Apply date filter based on column Z
    const matchesDateFilter = (() => {
      if (dateFilter === "all") return true

      // Get the text value from column Z (historyDateFilter field)
      const columnZValue = followUp.historyDateFilter
      if (!columnZValue) return false

      // Convert the column Z value to lowercase for comparison
      const columnZText = String(columnZValue).toLowerCase()

      // Match the filter type with the text in column Z
      switch (dateFilter) {
        case "today":
          return columnZText.includes("today")
        case "overdue":
          return columnZText.includes("overdue")
        case "upcoming":
          return columnZText.includes("upcoming")
        default:
          return true
      }
    })()

    // Apply company / person / NOB filters (person filter matches the
    // "Sales Person Name" column — see the pending-list filter above)
    const matchesCompanyFilter = companyFilter === "all" || followUp.companyName === companyFilter
    const matchesPersonFilter = personFilter === "all" || followUp.receiverName === personFilter || followUp.assignedTo === personFilter || followUp.personName === personFilter
    const matchesNobFilter = nobFilter === "all" || followUp.nob === nobFilter

    return matchesSearch && matchesFilterType && matchesDateFilter && matchesCompanyFilter && matchesPersonFilter && matchesNobFilter
  })

  // Add this function inside your FollowUp component
  const calculateDateFilterCounts = () => {
    const counts = {
      today: 0,
      overdue: 0,
      upcoming: 0,
      older: 0,
    }

    // Calculate counts for pending follow-ups
    pendingFollowUps.forEach((followUp) => {
      const columnCLValue = followUp.nextCallDate
      if (!columnCLValue) return

      const columnCLText = String(columnCLValue).toLowerCase()

      if (columnCLText.includes("today")) counts.today++
      if (columnCLText.includes("overdue")) counts.overdue++
      if (columnCLText.includes("upcoming")) counts.upcoming++
    })

    // Calculate counts for history follow-ups
    historyFollowUps.forEach((followUp) => {
      const nextCallDate = followUp.nextCallDate
      if (!nextCallDate) return

      try {
        const [day, month, year] = nextCallDate.split("/")
        const followUpDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (
          followUpDate.getDate() === today.getDate() &&
          followUpDate.getMonth() === today.getMonth() &&
          followUpDate.getFullYear() === today.getFullYear()
        ) {
          counts.today++
        } else if (followUpDate < today) {
          counts.older++
        }
      } catch (error) {
        console.error("Error parsing date:", error)
      }
    })

    return counts
  }

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }))
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(visibleColumns).every(Boolean)
    const newState = Object.fromEntries(Object.keys(visibleColumns).map((key) => [key, !allSelected]))
    setVisibleColumns(newState)
  }

  const handlePendingColumnToggle = (columnKey) => {
    setPendingVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }))
  }

  const handlePendingSelectAll = () => {
    const allSelected = Object.values(pendingVisibleColumns).every(Boolean)
    const newState = Object.fromEntries(Object.keys(pendingVisibleColumns).map((key) => [key, !allSelected]))
    setPendingVisibleColumns(newState)
  }

  const pendingColumnOptions = [
    { key: "plannedDate", label: "Planned Date" },
    { key: "delay", label: "Delay" },
    { key: "companyName", label: "Company Name" },
    { key: "salesPersonName", label: "Sales Person Name" },
    { key: "followUpCount", label: "No. of Follow-ups" },
    { key: "salesType", label: "Sales Type" },
    { key: "interaction", label: "Interaction" },
    { key: "leadSource", label: "Lead Source" },
    { key: "leadType", label: "Lead Type" },
    { key: "division", label: "Division" },
    { key: "nob", label: "NOB" },
    { key: "email", label: "Email Address" },
    { key: "state", label: "State" },
    { key: "city", label: "City" },
    { key: "address", label: "Address" },
    { key: "contactPersonName", label: "Contact Person Name" },
    { key: "designation", label: "Designation" },
    { key: "phoneNumber", label: "Phone Number" },
    { key: "customerSay", label: "Customer Says" },
    { key: "nextAction", label: "Next Action" },
    { key: "nextCallDateTime", label: "Next Call Date & Time" },
    { key: "notes", label: "Additional Note" },
    { key: "attachment", label: "Attachment" },
  ]

  const columnOptions = [
    { key: "timestamp", label: "Timestamp" },
    { key: "leadNo", label: "Lead No." },
    { key: "followUpNo", label: "Follow-up No." },
    { key: "companyName", label: "Company Name" },
    { key: "division", label: "Division" },
    { key: "customerSay", label: "Customer Say" },
    { key: "notInterestedReason", label: "Reason" },
    { key: "nextAction", label: "Next Action" },
    { key: "nextCallDateTime", label: "Next Call Date & Time" },
    { key: "status", label: "Status" },
    { key: "enquiryStatus", label: "Enquiry Status" },
    { key: "receivedDate", label: "Received Date" },
    { key: "state", label: "State" },
    { key: "projectName", label: "NOB" },
    { key: "salesType", label: "Sales Type" },
    { key: "productDate", label: "Product Date" },
    { key: "projectValue", label: "Project Value" },
    { key: "item1", label: "Item 1" },
    { key: "qty1", label: "Qty 1" },
    { key: "item2", label: "Item 2" },
    { key: "qty2", label: "Qty 2" },
    { key: "item3", label: "Item 3" },
    { key: "qty3", label: "Qty 3" },
    { key: "item4", label: "Item 4" },
    { key: "qty4", label: "Qty 4" },
    { key: "item5", label: "Item 5" },
    { key: "qty5", label: "Qty 5" },
    { key: "itemQty", label: "Item/Qty" }, // Add this line
  ]

  // Get the counts
  const dateFilterCounts = calculateDateFilterCounts()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnDropdown && !event.target.closest(".relative")) {
        setShowColumnDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showColumnDropdown])

  const pendingTotalPages = Math.ceil(filteredPendingFollowUps.length / itemsPerPage)
  const paginatedPendingFollowUps = filteredPendingFollowUps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const historyTotalPages = Math.ceil(filteredHistoryFollowUps.length / itemsPerPage)
  const paginatedHistoryFollowUps = filteredHistoryFollowUps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const pendingHeaders = [
    'Action', 'Lead No.',
    ...pendingColumnOptions.filter(opt => pendingVisibleColumns[opt.key]).map(opt => opt.label)
  ]

  const renderPendingRow = (followUp, index) => {
    const primaryContact = followUp.contactPersons?.[0] || {}
    const tatInfo = calculateLeadsTat(followUp, LEADS_STAGE_KEYS.FOLLOWUP_TRACKER, tatRules)

    return (
      <tr key={`${followUp.leadId}-${index}`} className="hover:bg-slate-50 transition-colors">
        <td className="sticky left-0 z-10 bg-white px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium border-r border-gray-200">
          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
            <button
              onClick={() => { setSelectedFollowUp(followUp); setShowPopup(true) }}
              className="w-full sm:w-auto px-2 sm:px-3 py-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-md transition-colors whitespace-nowrap"
            >
              View
            </button>
            <Link to={`/dashboard/leads/followup-tracker/new?leadId=${followUp.leadId}&leadNo=${followUp.leadId}`}>
              <button className={`w-full sm:w-auto px-2 sm:px-3 py-1 text-xs border rounded-md transition-colors whitespace-nowrap ${followUp.hasDraft ? "border-amber-300 text-amber-700 bg-amber-50/50 hover:bg-amber-100 font-semibold" : "border-sky-200 text-sky-600 hover:bg-sky-50"}`}>
                {followUp.hasDraft ? "Resume Draft" : "Call Now"} <ArrowRightIcon className="ml-1 h-3 w-3 inline" />
              </button>
            </Link>
          </div>
        </td>
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span>{followUp.leadId}</span>
            {followUp.hasDraft && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200" title="Draft saved for this follow-up">
                Draft
              </span>
            )}
          </div>
        </td>
        {pendingVisibleColumns.plannedDate && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-700 whitespace-nowrap font-medium">
            {tatInfo.plannedFormatted || "-"}
          </td>
        )}
        {pendingVisibleColumns.delay && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm whitespace-nowrap">
            <TatDelayBadge tat={tatInfo} />
          </td>
        )}
        {pendingVisibleColumns.companyName && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[120px] sm:max-w-[150px] truncate" title={followUp.companyName}>{followUp.companyName}</div>
          </td>
        )}
        {pendingVisibleColumns.salesPersonName && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[120px] sm:max-w-[150px] truncate" title={followUp.receiverName}>{followUp.receiverName || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.followUpCount && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-center whitespace-nowrap">
            <span className="inline-flex items-center justify-center min-w-[28px] px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200" title={`Completed ${followUp.followUpCount || 0} follow-up call(s)`}>
              {followUp.followUpCount || 0}
            </span>
          </td>
        )}
        {pendingVisibleColumns.salesType && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.salesType || "-"}</td>
        )}
        {pendingVisibleColumns.interaction && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.interaction || "-"}</td>
        )}
        {pendingVisibleColumns.leadSource && (
          <td className="px-3 sm:px-4 py-3 sm:py-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${followUp.priority === "High" ? "bg-red-100 text-red-800" : followUp.priority === "Medium" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"}`}>
              {followUp.leadSource}
            </span>
          </td>
        )}
        {pendingVisibleColumns.leadType && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.leadType || "-"}</td>
        )}
        {pendingVisibleColumns.division && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.division}>{followUp.division || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.nob && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.nob}>{followUp.nob || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.email && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[140px] sm:max-w-[180px] truncate" title={followUp.email}>{followUp.email || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.state && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.state}>{followUp.state || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.city && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.city}>{followUp.city || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.address && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[150px] sm:max-w-[200px] truncate" title={followUp.address}>{followUp.address || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.contactPersonName && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={primaryContact.name}>{primaryContact.name || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.designation && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[100px] sm:max-w-[120px] truncate" title={primaryContact.designation}>{primaryContact.designation || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.phoneNumber && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.phoneNumber || "-"}</td>
        )}
        {pendingVisibleColumns.customerSay && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[150px] sm:max-w-[200px] truncate" title={followUp.customerSay}>{followUp.customerSay || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.nextAction && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            {/* No follow-up recorded against this lead yet — it still needs a First Follow Up, not a "-" */}
            <div className="max-w-[120px] sm:max-w-[150px] truncate" title={followUp.nextAction || "First Follow Up"}>{followUp.nextAction || "First Follow Up"}</div>
          </td>
        )}
        {pendingVisibleColumns.nextCallDateTime && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{formatNextCallDateTime(followUp.nextCallDate, followUp.nextCallTime)}</td>
        )}
        {pendingVisibleColumns.notes && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
            <div className="max-w-[150px] sm:max-w-[200px] truncate" title={followUp.notes}>{followUp.notes || "-"}</div>
          </td>
        )}
        {pendingVisibleColumns.attachment && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">
            {followUp.attachment ? (
              <a
                href={followUp.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md text-xs font-medium transition-colors"
              >
                View
              </a>
            ) : (
              "-"
            )}
          </td>
        )}
      </tr>
    )
  }

  const renderPendingCard = (followUp, index) => {
    const tatInfo = calculateLeadsTat(followUp, LEADS_STAGE_KEYS.FOLLOWUP_TRACKER, tatRules)

    return (
      <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {followUp.leadId}
              </span>
              {followUp.hasDraft && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Draft
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${determinePriority(followUp.leadSource) === "High" ? "bg-red-100 text-red-800" : determinePriority(followUp.leadSource) === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                {determinePriority(followUp.leadSource)} Priority
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{followUp.companyName}</h3>
            <p className="text-sm text-gray-600">{followUp.personName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="font-medium">{followUp.phoneNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Follow-ups</p>
            <p className="font-bold text-blue-700">{followUp.followUpCount || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Division</p>
            <p className="font-medium">{followUp.division || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Next Call</p>
            <p className="font-medium text-orange-600">{followUp.nextCallDate ? formatNextCallDateTime(followUp.nextCallDate, followUp.nextCallTime) : "Not Set"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Planned Date</p>
            <p className="font-medium text-gray-800">{tatInfo.plannedFormatted || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Delay / TAT</p>
            <div className="mt-0.5"><TatDelayBadge tat={tatInfo} /></div>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Customer Say</p>
            <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs line-clamp-2">{followUp.customerSay || "No feedback recorded"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Enquiry Status</p>
            <p className="font-medium">{followUp.enquiryStatus || "-"}</p>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => { setSelectedFollowUp(followUp); setShowPopup(true) }}
            className="flex-1 items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            View Details
          </button>
          <Link to={`/dashboard/leads/followup-tracker/new?leadId=${followUp.leadId}&leadNo=${followUp.leadId}`} className="flex-1">
            <button className={`w-full flex items-center justify-center px-3 py-2 border rounded-md text-xs font-medium cursor-pointer ${followUp.hasDraft ? "border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-sky-600 bg-white text-sky-600 hover:bg-sky-50"}`}>
              {followUp.hasDraft ? "Resume Draft" : "Update"}
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const historyHeaders = columnOptions.filter(opt => visibleColumns[opt.key]).map(opt => opt.label)

  const renderHistoryRow = (followUp, index) => (
    <tr key={index} className="hover:bg-slate-50 transition-colors">
      {visibleColumns.timestamp && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.timestamp}</td>}
      {visibleColumns.leadNo && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{followUp.leadNo}</td>}
      {visibleColumns.followUpNo && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            {followUp.followUpNo || `Follow-up #${followUp.followUpIndex || 1}`}
          </span>
        </td>
      )}
      {visibleColumns.companyName && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[120px] sm:max-w-[150px] truncate" title={followUp.companyName}>{followUp.companyName}</div></td>}
      {visibleColumns.division && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.division}>{followUp.division}</div></td>}
      {visibleColumns.customerSay && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[150px] sm:max-w-[200px] truncate" title={followUp.customerSay}>{followUp.customerSay}</div></td>}
      {visibleColumns.notInterestedReason && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[150px] sm:max-w-[200px] truncate" title={followUp.notInterestedReason}>
            {followUp.notInterestedReason || "-"}
          </div>
        </td>
      )}
      {visibleColumns.nextAction && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.nextAction}>{followUp.nextAction}</div></td>}
      {visibleColumns.nextCallDateTime && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{formatNextCallDateTime(followUp.nextCallDate, followUp.nextCallTime)}</td>}
      {visibleColumns.status && (
        <td className="px-3 sm:px-4 py-3 sm:py-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${followUp.status === "Completed" ? "bg-green-100 text-green-800" : followUp.status === "Pending" ? "bg-sky-100 text-sky-800" : "bg-red-100 text-red-800"}`}>
            {followUp.status}
          </span>
        </td>
      )}
      {visibleColumns.enquiryStatus && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.enquiryReceivedStatus}>{followUp.enquiryReceivedStatus}</div></td>}
      {visibleColumns.receivedDate && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.enquiryReceivedDate}</td>}
      {visibleColumns.state && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[80px] sm:max-w-[100px] truncate" title={followUp.enquiryState}>{followUp.enquiryState}</div></td>}
      {visibleColumns.projectName && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.projectName}>{followUp.projectName}</div></td>}
      {visibleColumns.salesType && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.salesType}</td>}
      {visibleColumns.productDate && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.requiredProductDate}</td>}
      {visibleColumns.projectValue && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.projectApproxValue}</td>}
      {visibleColumns.item1 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName1}>{followUp.itemName1}</div></td>}
      {visibleColumns.qty1 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity1}</td>}
      {visibleColumns.item2 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName2}>{followUp.itemName2}</div></td>}
      {visibleColumns.qty2 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity2}</td>}
      {visibleColumns.item3 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName3}>{followUp.itemName3}</div></td>}
      {visibleColumns.qty3 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity3}</td>}
      {visibleColumns.item4 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName4}>{followUp.itemName4}</div></td>}
      {visibleColumns.qty4 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity4}</td>}
      {visibleColumns.item5 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName5}>{followUp.itemName5}</div></td>}
      {visibleColumns.qty5 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity5}</td>}
      {visibleColumns.itemQty && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="min-w-[300px] break-words whitespace-normal" title={formatItemQty(followUp.itemQty)}>{formatItemQty(followUp.itemQty)}</div></td>}
    </tr>
  )

  const renderHistoryCard = (followUp, index) => (
    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-500">{followUp.timestamp}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              {followUp.followUpNo || `Follow-up #${followUp.followUpIndex || 1}`}
            </span>
          </div>
          <h3 className="font-bold text-gray-900">{followUp.companyName}</h3>
          <p className="text-xs text-blue-600 font-medium">{followUp.leadNo}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${followUp.status === "Completed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
          {followUp.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <span className="block text-xs text-gray-400">NOB</span>
          <p className="truncate">{followUp.projectName}</p>
        </div>
        <div>
          <span className="block text-xs text-gray-400">Division</span>
          <p className="truncate">{followUp.division || "-"}</p>
        </div>
        <div>
          <span className="block text-xs text-gray-400">Enquiry Status</span>
          <p>{followUp.enquiryReceivedStatus}</p>
        </div>
        <div>
          <span className="block text-xs text-gray-400">Sales Type</span>
          <p>{followUp.salesType}</p>
        </div>
        <div>
          <span className="block text-xs text-gray-400">Value</span>
          <p>{followUp.projectApproxValue}</p>
        </div>
        {followUp.notInterestedReason && (
          <div className="col-span-2 text-rose-700 bg-rose-50 p-2 rounded text-xs border border-rose-100">
            <span className="font-semibold text-rose-900">Reason: </span>
            {followUp.notInterestedReason}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <PhoneCall size={22} />
            </div>
            Followup Tracker
            {pendingFollowUps.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-xs">
                {pendingFollowUps.length} Pending
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Track lead communications, pending follow-ups, interaction history, and call schedules
          </p>
        </div>
      </div>

      {/* Filters & Tabs Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:justify-between lg:items-center">
          {/* Tab Navigation - Modern Pill Switch */}
          <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Pending ({pendingFollowUps.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              History ({historyFollowUps.length})
            </button>
          </div>

          {/* Filters Grid */}
          <div className="flex flex-wrap items-center gap-2.5">
              {/* Company / Person / NOB filters — shown for both Pending and
                  History tabs, with their option lists sourced from
                  whichever tab's data is currently active. */}
              {(() => {
                const filterSource = activeTab === "pending" ? pendingFollowUps : historyFollowUps
                return (
                  <>
                    {/* Company Name Filter */}
                    <div className="min-w-0 lg:min-w-[140px]">
                      <select
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      >
                        <option value="all">All Companies</option>
                        {Array.from(new Set(filterSource.map((item) => item.companyName)))
                          .filter(Boolean)
                          .map((company) => (
                            <option key={company} value={company}>{company}</option>
                          ))}
                      </select>
                    </div>

                    {/* Sales Person Name Filter */}
                    <div className="min-w-0 lg:min-w-[130px]">
                      <select
                        value={personFilter}
                        onChange={(e) => setPersonFilter(e.target.value)}
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      >
                        <option value="all">All Persons</option>
                        {Array.from(new Set(filterSource.map((item) => item.receiverName)))
                          .filter(Boolean)
                          .map((person) => (
                            <option key={person} value={person}>{person}</option>
                          ))}
                      </select>
                    </div>

                    {/* NOB Filter */}
                    <div className="min-w-0 lg:min-w-[110px]">
                      <select
                        value={nobFilter}
                        onChange={(e) => setNobFilter(e.target.value)}
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      >
                        <option value="all">All NOB</option>
                        {Array.from(new Set(filterSource.map((item) => item.nob)))
                          .filter(Boolean)
                          .map((nob) => (
                            <option key={nob} value={nob}>{nob}</option>
                          ))}
                      </select>
                    </div>
                  </>
                )
              })()}

              {/* Date Filter */}
              <div className="min-w-0 lg:min-w-[130px]">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="all">All</option>
                  {activeTab === "pending" ? (
                    <>
                      <option value="today">Today ({dateFilterCounts.today})</option>
                      <option value="overdue">Overdue ({dateFilterCounts.overdue})</option>
                      <option value="upcoming">Upcoming ({dateFilterCounts.upcoming})</option>
                    </>
                  ) : (
                    <>
                      <option value="today">Today's Calls</option>
                      <option value="older">Older Calls</option>
                    </>
                  )}
                </select>
              </div>

              {/* Followup Stage Filter Dropdown */}
              <div className="min-w-0 lg:min-w-[130px]">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  <option value="all">All</option>
                  <option value="first">First Followup</option>
                  <option value="multi">Expected</option>
                </select>
              </div>

              {/* Column Selection Dropdown - shown for both Pending and History tabs */}
              {(() => {
                const isPendingTab = activeTab === "pending"
                const activeColumnOptions = isPendingTab ? pendingColumnOptions : columnOptions
                const activeVisibleColumns = isPendingTab ? pendingVisibleColumns : visibleColumns
                const activeColumnToggle = isPendingTab ? handlePendingColumnToggle : handleColumnToggle
                const activeSelectAll = isPendingTab ? handlePendingSelectAll : handleSelectAll

                return (
                  <div className="min-w-0 lg:min-w-[150px] relative">
                    <button
                      onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white flex items-center justify-between gap-2"
                    >
                      <span className="whitespace-nowrap">Select Columns</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${showColumnDropdown ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showColumnDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                        <div className="p-2">
                          {/* Select All Option */}
                          <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              id="select-all"
                              checked={Object.values(activeVisibleColumns).every(Boolean)}
                              onChange={activeSelectAll}
                              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                            />
                            <label htmlFor="select-all" className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                              All Columns
                            </label>
                          </div>

                          <hr className="my-2" />

                          {/* Individual Column Options */}
                          {activeColumnOptions.map((option) => (
                            <div key={option.key} className="flex items-center p-2 hover:bg-gray-50 rounded">
                              <input
                                type="checkbox"
                                id={`column-${option.key}`}
                                checked={activeVisibleColumns[option.key]}
                                onChange={() => activeColumnToggle(option.key)}
                                className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                              />
                              <label
                                htmlFor={`column-${option.key}`}
                                className="ml-2 text-sm text-gray-700 cursor-pointer flex-1"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Search Input - Full width on mobile. Pending intentionally
                has no search box; only shown for the History tab. */}
            {activeTab === "history" && (
              <div className="relative w-full lg:w-auto lg:min-w-[250px]">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="search"
                  placeholder="Search Followup Tracker..."
                  className="pl-8 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Loading State */}
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-4">Loading follow-up data...</p>
            </div>
          ) : (
            <>
              {/* Pending Tab Content */}
              {activeTab === "pending" && (
                <div className="w-full">
                  <DataTable
                    headers={pendingHeaders}
                    data={paginatedPendingFollowUps}
                    renderRow={renderPendingRow}
                    renderCard={renderPendingCard}
                    minWidth="2600px"
                    currentPage={currentPage}
                    totalPages={pendingTotalPages}
                    itemsPerPage={itemsPerPage}
                    totalResults={filteredPendingFollowUps.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                  />
                </div>
              )}

              {/* History Tab Content */}
              {activeTab === "history" && (
                <div className="w-full">
                  <DataTable
                    headers={historyHeaders}
                    data={paginatedHistoryFollowUps}
                    renderRow={renderHistoryRow}
                    renderCard={renderHistoryCard}
                    minWidth="1200px"
                    currentPage={currentPage}
                    totalPages={historyTotalPages}
                    itemsPerPage={itemsPerPage}
                    totalResults={filteredHistoryFollowUps.length}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                  />
                </div>
              )}
            </>
          )}
      </div>

        {/* Responsive Popup Modal */}
        {showPopup && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${fadeIn}`}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPopup(false)}></div>
            <div
              className={`relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ${slideIn}`}
            >
              {/* Modal Header */}
              <div className="bg-white border-b p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-4">
                  Lead Details: {selectedFollowUp?.leadId}
                </h3>
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-shrink-0 text-gray-500 hover:text-gray-700 focus:outline-none p-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="overflow-y-auto flex-1 min-h-0">
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Lead Info */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lead Info</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Lead Number</p>
                        <p className="text-base font-semibold break-words">{selectedFollowUp?.leadId}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Sales Person Name</p>
                        <p className="text-base break-words">{selectedFollowUp?.receiverName || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Lead Source</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {selectedFollowUp?.leadSource || "-"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Lead Type</p>
                        <p className="text-base break-words">{selectedFollowUp?.leadType || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Created Date</p>
                        <p className="text-base">{formatPopupDate(selectedFollowUp?.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Company & Contact */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Company & Contact</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Company Name</p>
                        <p className="text-base break-words">{selectedFollowUp?.companyName}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Person Name</p>
                        <p className="text-base break-words">{selectedFollowUp?.personName}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Phone Number</p>
                        <p className="text-base break-words">{selectedFollowUp?.phoneNumber}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Email Address</p>
                        <p className="text-base break-words">{selectedFollowUp?.email || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">State</p>
                        <p className="text-base break-words">{selectedFollowUp?.state || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">City / Location</p>
                        <p className="text-base break-words">{selectedFollowUp?.city || selectedFollowUp?.location || "-"}</p>
                      </div>
                    </div>
                    {selectedFollowUp?.address && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-base break-words italic">"{selectedFollowUp.address}"</p>
                      </div>
                    )}
                  </div>

                  {/* Business Details */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Business Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Nature of Business</p>
                        <p className="text-base break-words">{selectedFollowUp?.nob || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Division</p>
                        <p className="text-base break-words">{selectedFollowUp?.division || "-"}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">GST Number</p>
                        <p className="text-base break-words uppercase">{selectedFollowUp?.gst || "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Persons */}
                  {selectedFollowUp?.contactPersons?.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Persons</h4>
                      <div className="space-y-2">
                        {selectedFollowUp.contactPersons.map((person, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-md text-sm">
                            <span className="font-semibold text-gray-800">{person.name || "-"}</span>
                            {person.designation && <span className="text-gray-500"> — {person.designation}</span>}
                            {person.number && <span className="text-gray-500"> ({person.number})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Status */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Follow-up Status</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Enquiry Status</p>
                        <p className="text-base break-words">{selectedFollowUp?.enquiryStatus}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">What Customer Said</p>
                      <div className="p-4 bg-gray-50 rounded-md">
                        <p className="text-base break-words">{selectedFollowUp?.customerSay}</p>
                      </div>
                    </div>
                    {selectedFollowUp?.notes && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <div className="p-4 bg-gray-50 rounded-md">
                          <p className="text-base break-words">{selectedFollowUp.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Follow-up History Timeline */}
                  {(() => {
                    const currentLeadId = selectedFollowUp?.leadId || selectedFollowUp?.leadNo;
                    const leadHistory = historyFollowUps.filter(h => {
                      const hNo = (h.leadNo || h.leadId || "").toLowerCase();
                      const cNo = (currentLeadId || "").toLowerCase();
                      return hNo && cNo && hNo === cNo;
                    });

                    return (
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Follow-up History</h4>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {leadHistory.length} {leadHistory.length === 1 ? "Follow-up" : "Follow-ups"}
                          </span>
                        </div>
                        {leadHistory.length > 0 ? (
                          <div className="space-y-3">
                            {leadHistory.map((historyItem, idx) => (
                              <div key={idx} className="p-4 border border-gray-200 rounded-xl bg-white shadow-xs relative">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2.5 gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md w-fit">
                                      {historyItem.timestamp || "Unknown Date"}
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      {historyItem.followUpNo || `Follow-up #${historyItem.followUpIndex || (leadHistory.length - idx)}`}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {historyItem.enquiryReceivedStatus && (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        historyItem.enquiryReceivedStatus === "Expected"
                                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                                          : historyItem.enquiryReceivedStatus === "Make Quotation"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : historyItem.enquiryReceivedStatus === "Not Interested"
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-purple-50 text-purple-700 border border-purple-200"
                                      }`}>
                                        {historyItem.enquiryReceivedStatus}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                  {historyItem.customerSay && (
                                    <div className="text-sm text-gray-700">
                                      <span className="font-semibold text-gray-900">Feedback: </span>
                                      {historyItem.customerSay}
                                    </div>
                                  )}
                                  {historyItem.notInterestedReason && (
                                    <div className="text-sm text-rose-700 bg-rose-50/80 p-2.5 rounded-lg border border-rose-200/60">
                                      <span className="font-semibold text-rose-900">Reason for Not Interested: </span>
                                      {historyItem.notInterestedReason}
                                    </div>
                                  )}
                                  {historyItem.interaction && (
                                    <div className="text-sm text-gray-700">
                                      <span className="font-semibold text-gray-900">Interaction: </span>
                                      {historyItem.interaction}
                                    </div>
                                  )}
                                  {historyItem.nextAction && (
                                    <div className="text-sm text-gray-700">
                                      <span className="font-semibold text-gray-900">Next Action: </span>
                                      {historyItem.nextAction} 
                                      {historyItem.nextCallDate && ` on ${historyItem.nextCallDate}`}
                                      {historyItem.nextCallTime && ` at ${historyItem.nextCallTime}`}
                                    </div>
                                  )}
                                  {historyItem.notes && (
                                    <div className="text-sm text-gray-700">
                                      <span className="font-semibold text-gray-900">Notes: </span>
                                      {historyItem.notes}
                                    </div>
                                  )}
                                  {historyItem.projectName && (
                                    <div className="text-sm text-gray-700">
                                      <span className="font-semibold text-gray-900">NOB: </span>
                                      {historyItem.projectName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
                            No previous follow-up history recorded yet for this lead.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t bg-white p-4 sm:p-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 flex-shrink-0">
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                >
                  Close
                </button>
                <Link
                  to={`/dashboard/leads/followup-tracker/new?leadId=${selectedFollowUp?.leadId}&leadNo=${selectedFollowUp?.leadId}`}
                  className="w-full sm:w-auto"
                >
                  <button className="w-full px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors">
                    Call Now <ArrowRightIcon className="ml-1 h-4 w-4 inline" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      {/* End of Main Content Area */}
    </div>
  )
}

export default FollowupTracker

