"use client"

import { useState, useEffect, useContext } from "react"
import { Link } from "react-router-dom"
import { PhoneCall, MapPin, Clock, CheckCircle2, Search, X } from "lucide-react"
import { ArrowRightIcon } from "../components/Icons"
import { AuthContext } from "../context/AuthContext" // Import AuthContext
import { mockApi } from "../services/mockApi"
import DataTable from "../components/DataTable"
import {
  fetchLeadsTatRules,
  calculateLeadsTat,
  resolveLeadsTatRule,
  parseLeadDate,
  LEADS_STAGE_KEYS,
  TatDelayBadge,
  getLeadDateCategory,
} from "../utils/leadsTatEngine"

const slideIn = "animate-in slide-in-from-right duration-300"
const slideOut = "animate-out slide-out-to-right duration-300"
const fadeIn = "animate-in fade-in duration-300"
const fadeOut = "animate-out fade-out duration-300"

function FollowupTracker() {
  const { currentUser, userType, isAdmin, isSalesPerson } = useContext(AuthContext) // Get user info and admin function
  const isUserSalesPerson = isSalesPerson || (!isAdmin())
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
  const [personFilter, setPersonFilter] = useState(isUserSalesPerson && currentUser?.username ? currentUser.username : "all")

  useEffect(() => {
    if (isUserSalesPerson && currentUser?.username) {
      setPersonFilter(currentUser.username)
    }
  }, [isUserSalesPerson, currentUser])
  const [nobFilter, setNobFilter] = useState("all")
  const [divisionFilter, setDivisionFilter] = useState("all")
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
    enquiryStatus: true,
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
  // Helper to determine the TAT date category for a pending follow-up
  const getFollowUpDateCategory = (followUp) => {
    return getLeadDateCategory(followUp, LEADS_STAGE_KEYS.FOLLOWUP_TRACKER, tatRules)
  }

  // Helper function to check date filter condition
  const checkDateFilter = (followUp, filterType) => {
    if (filterType === "all") return true

    if (activeTab === "pending") {
      const cat = getFollowUpDateCategory(followUp)
      return cat === filterType
    } else {
      // History tab filtering
      const dateVal = followUp.timestamp || followUp.updatedAt || followUp.date || followUp.nextCallDate
      if (!dateVal) return false
      const parsed = parseLeadDate(dateVal)
      if (!parsed || isNaN(parsed.getTime())) return true
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (filterType === "today") {
        return parsed >= today && parsed < tomorrow
      } else if (filterType === "older" || filterType === "overdue") {
        return parsed < today
      }
      return true
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

  // Filter function for search in both sections.
  const filteredPendingFollowUps = pendingFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      (followUp.companyName && followUp.companyName.toLowerCase().includes(searchLower)) ||
      (followUp.leadId && followUp.leadId.toLowerCase().includes(searchLower)) ||
      (followUp.leadNo && followUp.leadNo.toString().toLowerCase().includes(searchLower)) ||
      (followUp.receiverName && followUp.receiverName.toLowerCase().includes(searchLower)) ||
      (followUp.personName && followUp.personName.toLowerCase().includes(searchLower)) ||
      (followUp.phoneNumber && followUp.phoneNumber.toString().toLowerCase().includes(searchLower)) ||
      (followUp.leadSource && followUp.leadSource.toLowerCase().includes(searchLower)) ||
      (followUp.location && followUp.location.toLowerCase().includes(searchLower)) ||
      (followUp.division && followUp.division.toLowerCase().includes(searchLower)) ||
      (followUp.nob && followUp.nob.toLowerCase().includes(searchLower)) ||
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
    const matchesPersonFilter = personFilter === "all" || followUp.receiverName === personFilter || followUp.assignedTo === personFilter || followUp.personName === personFilter

    // Apply NOB filter
    const matchesNobFilter = nobFilter === "all" || followUp.nob === nobFilter || followUp.projectName === nobFilter

    // Apply Division filter
    const matchesDivisionFilter = divisionFilter === "all" || followUp.division === divisionFilter

    return (
      matchesSearch &&
      matchesFilterType &&
      matchesDateFilter &&
      matchesCompanyFilter &&
      matchesPersonFilter &&
      matchesNobFilter &&
      matchesDivisionFilter
    )
  })

  useEffect(() => {
    // Company/Person/NOB filter options are sourced from whichever tab's
    // dataset is active, so reset the selections on every tab switch —
    // otherwise a value picked in one tab could silently not match anything
    // in the other.
    setCurrentPage(1)
    setCompanyFilter("all")
    setPersonFilter(isUserSalesPerson && currentUser?.username ? currentUser.username : "all")
    setNobFilter("all")
    setDivisionFilter("all")
  }, [activeTab, isUserSalesPerson, currentUser])

  const filteredHistoryFollowUps = historyFollowUps.filter((followUp) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      searchTerm === "" ||
      (followUp.leadNo && followUp.leadNo.toString().toLowerCase().includes(searchLower)) ||
      (followUp.companyName && followUp.companyName.toLowerCase().includes(searchLower)) ||
      (followUp.receiverName && followUp.receiverName.toLowerCase().includes(searchLower)) ||
      (followUp.personName && followUp.personName.toLowerCase().includes(searchLower)) ||
      (followUp.assignedTo && followUp.assignedTo.toLowerCase().includes(searchLower)) ||
      (followUp.customerSay && followUp.customerSay.toLowerCase().includes(searchLower)) ||
      (followUp.status && followUp.status.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedStatus && followUp.enquiryReceivedStatus.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryReceivedDate && followUp.enquiryReceivedDate.toLowerCase().includes(searchLower)) ||
      (followUp.enquiryState && followUp.enquiryState.toLowerCase().includes(searchLower)) ||
      (followUp.projectName && followUp.projectName.toLowerCase().includes(searchLower)) ||
      (followUp.nob && followUp.nob.toLowerCase().includes(searchLower)) ||
      (followUp.division && followUp.division.toLowerCase().includes(searchLower)) ||
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

    // Apply date filter
    const matchesDateFilter = checkDateFilter(followUp, dateFilter)

    // Apply company / person / NOB / division filters (person filter matches the
    // "Sales Person Name" column — see the pending-list filter above)
    const matchesCompanyFilter = companyFilter === "all" || followUp.companyName === companyFilter
    const matchesPersonFilter = personFilter === "all" || followUp.receiverName === personFilter || followUp.assignedTo === personFilter || followUp.personName === personFilter
    const matchesNobFilter = nobFilter === "all" || followUp.nob === nobFilter || followUp.projectName === nobFilter
    const matchesDivisionFilter = divisionFilter === "all" || followUp.division === divisionFilter

    return matchesSearch && matchesFilterType && matchesDateFilter && matchesCompanyFilter && matchesPersonFilter && matchesNobFilter && matchesDivisionFilter
  })

  const calculateDateFilterCounts = () => {
    const counts = {
      today: 0,
      overdue: 0,
      upcoming: 0,
      historyToday: 0,
      historyOlder: 0,
    }

    // Calculate counts for pending follow-ups using TAT engine
    pendingFollowUps.forEach((followUp) => {
      const cat = getFollowUpDateCategory(followUp)
      if (cat === "today") counts.today++
      else if (cat === "overdue") counts.overdue++
      else if (cat === "upcoming") counts.upcoming++
    })

    // Calculate counts for history follow-ups
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    historyFollowUps.forEach((followUp) => {
      const dateVal = followUp.timestamp || followUp.updatedAt || followUp.date || followUp.nextCallDate
      if (!dateVal) return
      const parsed = parseLeadDate(dateVal)
      if (!parsed || isNaN(parsed.getTime())) return
      if (parsed >= today && parsed < tomorrow) {
        counts.historyToday++
      } else if (parsed < today) {
        counts.historyOlder++
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
    { key: "enquiryStatus", label: "Enquiry Status" },
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
        {pendingVisibleColumns.enquiryStatus && (
          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
            {(() => {
              const status = followUp.enquiryStatus || followUp.enquiryReceivedStatus || "Expected";
              if (status === "Make Quotation") {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Make Quotation
                  </span>
                )
              }
              if (status === "Expected") {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Expected
                  </span>
                )
              }
              if (status === "Not Interested") {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Not Interested
                  </span>
                )
              }
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {status}
                </span>
              )
            })()}
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <a
                  href={followUp.attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md text-xs font-medium transition-colors"
                >
                  View
                </a>
                {followUp.attachmentLocation?.latitude && (
                  <a
                    href={`https://www.google.com/maps?q=${followUp.attachmentLocation.latitude},${followUp.attachmentLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={followUp.attachmentLocation.address || `${followUp.attachmentLocation.latitude.toFixed(5)}, ${followUp.attachmentLocation.longitude.toFixed(5)}`}
                    className="inline-flex items-center gap-1 px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium transition-colors"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span className="hidden xl:inline text-[11px] max-w-[110px] truncate">{followUp.attachmentLocation.address || "Map"}</span>
                  </a>
                )}
              </div>
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
            <p className="text-xs text-gray-500 mb-1">Enquiry Status</p>
            {(() => {
              const status = followUp.enquiryStatus || followUp.enquiryReceivedStatus || "Expected";
              if (status === "Make Quotation") {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Make Quotation
                  </span>
                )
              }
              if (status === "Expected") {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Expected
                  </span>
                )
              }
              if (status === "Not Interested") {
                return (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Not Interested
                  </span>
                )
              }
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {status}
                </span>
              )
            })()}
          </div>
          {followUp.attachment && (
            <div className="col-span-2 pt-1 flex items-center gap-2 flex-wrap">
              <a
                href={followUp.attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md text-xs font-medium transition-colors"
              >
                View Attachment
              </a>
              {followUp.attachmentLocation?.latitude && (
                <a
                  href={`https://www.google.com/maps?q=${followUp.attachmentLocation.latitude},${followUp.attachmentLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={followUp.attachmentLocation.address || `${followUp.attachmentLocation.latitude.toFixed(5)}, ${followUp.attachmentLocation.longitude.toFixed(5)}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium transition-colors"
                >
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span className="max-w-[130px] truncate">{followUp.attachmentLocation.address || "Map Location"}</span>
                </a>
              )}
            </div>
          )}
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
      {visibleColumns.enquiryStatus && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
          {(() => {
            const status = followUp.enquiryReceivedStatus || followUp.enquiryStatus;
            if (status === "Make Quotation") {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Make Quotation
                </span>
              )
            }
            if (status === "Expected") {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Expected
                </span>
              )
            }
            if (status === "Not Interested") {
              return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Not Interested
                </span>
              )
            }
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {status || "-"}
              </span>
            )
          })()}
        </td>
      )}
      {visibleColumns.receivedDate && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.enquiryReceivedDate || followUp.receivedDate || followUp.timestamp || "-"}</td>}
      {visibleColumns.state && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[80px] sm:max-w-[100px] truncate" title={followUp.enquiryState || followUp.state}>{followUp.enquiryState || followUp.state || "-"}</div></td>}
      {visibleColumns.projectName && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.projectName || followUp.nob}>{followUp.projectName || followUp.nob || "-"}</div></td>}
      {visibleColumns.salesType && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.salesType || "-"}</td>}
      {visibleColumns.productDate && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.requiredProductDate || followUp.productDate || followUp.timestamp || "-"}</td>}
      {visibleColumns.projectValue && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.projectApproxValue || followUp.projectValue || "-"}</td>}
      {visibleColumns.item1 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName1 || followUp.items?.[0]?.name}>{followUp.itemName1 || followUp.items?.[0]?.name || "-"}</div></td>}
      {visibleColumns.qty1 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity1 || followUp.items?.[0]?.quantity || "-"}</td>}
      {visibleColumns.item2 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName2 || followUp.items?.[1]?.name}>{followUp.itemName2 || followUp.items?.[1]?.name || "-"}</div></td>}
      {visibleColumns.qty2 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity2 || followUp.items?.[1]?.quantity || "-"}</td>}
      {visibleColumns.item3 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName3 || followUp.items?.[2]?.name}>{followUp.itemName3 || followUp.items?.[2]?.name || "-"}</div></td>}
      {visibleColumns.qty3 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity3 || followUp.items?.[2]?.quantity || "-"}</td>}
      {visibleColumns.item4 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName4 || followUp.items?.[3]?.name}>{followUp.itemName4 || followUp.items?.[3]?.name || "-"}</div></td>}
      {visibleColumns.qty4 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity4 || followUp.items?.[3]?.quantity || "-"}</td>}
      {visibleColumns.item5 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="max-w-[100px] sm:max-w-[120px] truncate" title={followUp.itemName5 || followUp.items?.[4]?.name}>{followUp.itemName5 || followUp.items?.[4]?.name || "-"}</div></td>}
      {visibleColumns.qty5 && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{followUp.quantity5 || followUp.items?.[4]?.quantity || "-"}</td>}
      {visibleColumns.itemQty && <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500"><div className="min-w-[300px] break-words whitespace-normal" title={formatItemQty(followUp.itemQty)}>{formatItemQty(followUp.itemQty) || "-"}</div></td>}
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 p-4 md:p-5 shadow-xs space-y-3.5">
        {/* Top Tier: Tabs + Search + Column Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
          {/* Tab Navigation */}
          <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Clock size={14} className={activeTab === "pending" ? "text-blue-600 dark:text-blue-400" : "text-gray-400"} />
              <span>Pending</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "pending"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {pendingFollowUps.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <CheckCircle2 size={14} className={activeTab === "history" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"} />
              <span>History</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === "history"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {historyFollowUps.length}
              </span>
            </button>
          </div>

          {/* Search & Column Selector Controls */}
          <div className="flex items-center gap-2.5 flex-1 md:flex-initial justify-end">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search lead, company, person..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 h-[36px]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Column Selection Dropdown */}
            {(() => {
              const isPendingTab = activeTab === "pending"
              const activeColumnOptions = isPendingTab ? pendingColumnOptions : columnOptions
              const activeVisibleColumns = isPendingTab ? pendingVisibleColumns : visibleColumns
              const activeColumnToggle = isPendingTab ? handlePendingColumnToggle : handleColumnToggle
              const activeSelectAll = isPendingTab ? handlePendingSelectAll : handleSelectAll

              return (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    className="px-3 py-2 text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between gap-2 h-[36px] whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                  >
                    <span>Select Columns</span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showColumnDropdown ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showColumnDropdown && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto p-2">
                      <div className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <input
                          type="checkbox"
                          id="select-all-adv"
                          checked={Object.values(activeVisibleColumns).every(Boolean)}
                          onChange={activeSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded cursor-pointer"
                        />
                        <label htmlFor="select-all-adv" className="ml-2.5 text-xs font-bold text-gray-900 dark:text-white cursor-pointer select-none">
                          All Columns
                        </label>
                      </div>

                      <hr className="my-1.5 border-gray-100 dark:border-slate-800" />

                      <div className="space-y-0.5">
                        {activeColumnOptions.map((option) => (
                          <div key={option.key} className="flex items-center p-1.5 px-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <input
                              type="checkbox"
                              id={`adv-column-${option.key}`}
                              checked={activeVisibleColumns[option.key]}
                              onChange={() => activeColumnToggle(option.key)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 rounded cursor-pointer"
                            />
                            <label
                              htmlFor={`adv-column-${option.key}`}
                              className="ml-2.5 text-xs text-gray-700 dark:text-slate-300 cursor-pointer flex-1 select-none"
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
        </div>

        {/* Bottom Tier: Filter Dropdowns Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          {(() => {
            const filterSource = activeTab === "pending" ? pendingFollowUps : historyFollowUps
            return (
              <>
                {/* Company Name Filter */}
                <div className="flex-1 min-w-[130px] sm:flex-initial sm:w-36">
                  <select
                    value={companyFilter}
                    onChange={(e) => {
                      setCompanyFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
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
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  {(!isAdmin() && isUserSalesPerson) ? (
                    <div className="w-full px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 font-semibold h-[36px] flex items-center justify-between cursor-not-allowed select-none">
                      <span className="truncate">{currentUser?.username || personFilter}</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-1">Auto</span>
                    </div>
                  ) : (
                    <select
                      value={personFilter}
                      onChange={(e) => {
                        setPersonFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                    >
                      <option value="all">All Persons</option>
                      {personFilter && personFilter !== "all" && (
                        <option value={personFilter}>{personFilter}</option>
                      )}
                      {Array.from(new Set(filterSource.map((item) => item.receiverName || item.assignedTo || item.personName)))
                        .filter(Boolean)
                        .filter(p => p !== personFilter)
                        .map((person) => (
                          <option key={person} value={person}>{person}</option>
                        ))}
                    </select>
                  )}
                </div>

                {/* NOB Filter */}
                <div className="flex-1 min-w-[110px] sm:flex-initial sm:w-28">
                  <select
                    value={nobFilter}
                    onChange={(e) => {
                      setNobFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All NOB</option>
                    {Array.from(new Set(filterSource.map((item) => item.nob || item.projectName)))
                      .filter(Boolean)
                      .map((nob) => (
                        <option key={nob} value={nob}>{nob}</option>
                      ))}
                  </select>
                </div>

                {/* Division Filter */}
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  <select
                    value={divisionFilter}
                    onChange={(e) => {
                      setDivisionFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All Divisions</option>
                    {Array.from(new Set(filterSource.map((item) => item.division)))
                      .filter(Boolean)
                      .map((div) => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All Dates</option>
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
                <div className="flex-1 min-w-[120px] sm:flex-initial sm:w-32">
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-slate-200 h-[36px]"
                  >
                    <option value="all">All Stages</option>
                    <option value="first">First Followup</option>
                    <option value="multi">Expected</option>
                  </select>
                </div>

                {/* Reset Filters button if any active */}
                {(companyFilter !== "all" || divisionFilter !== "all" || personFilter !== "all" || nobFilter !== "all" || dateFilter !== "all" || filterType !== "all" || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyFilter("all")
                      setDivisionFilter("all")
                      setPersonFilter(isUserSalesPerson && currentUser?.username ? currentUser.username : "all")
                      setNobFilter("all")
                      setDateFilter("all")
                      setFilterType("all")
                      setSearchTerm("")
                      setCurrentPage(1)
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer whitespace-nowrap h-[36px] flex items-center gap-1"
                  >
                    <X size={13} /> Reset Filters
                  </button>
                )}
              </>
            )
          })()}
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
                    {selectedFollowUp?.attachment && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Attachment & Location</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={selectedFollowUp.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                          >
                            View Attachment
                          </a>
                          {selectedFollowUp.attachmentLocation?.latitude && (
                            <a
                              href={`https://www.google.com/maps?q=${selectedFollowUp.attachmentLocation.latitude},${selectedFollowUp.attachmentLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={selectedFollowUp.attachmentLocation.address || `${selectedFollowUp.attachmentLocation.latitude.toFixed(5)}, ${selectedFollowUp.attachmentLocation.longitude.toFixed(5)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="max-w-[250px] truncate">{selectedFollowUp.attachmentLocation.address || `${selectedFollowUp.attachmentLocation.latitude.toFixed(4)}, ${selectedFollowUp.attachmentLocation.longitude.toFixed(4)}`}</span>
                            </a>
                          )}
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
                                  {historyItem.attachment && (
                                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                                      <a
                                        href={historyItem.attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                                      >
                                        View Attachment
                                      </a>
                                      {historyItem.attachmentLocation?.latitude && (
                                        <a
                                          href={`https://www.google.com/maps?q=${historyItem.attachmentLocation.latitude},${historyItem.attachmentLocation.longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={historyItem.attachmentLocation.address || `${historyItem.attachmentLocation.latitude.toFixed(5)}, ${historyItem.attachmentLocation.longitude.toFixed(5)}`}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                        >
                                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                          <span className="max-w-[200px] truncate">{historyItem.attachmentLocation.address || `${historyItem.attachmentLocation.latitude.toFixed(4)}, ${historyItem.attachmentLocation.longitude.toFixed(4)}`}</span>
                                        </a>
                                      )}
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

