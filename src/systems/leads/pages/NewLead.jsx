import { useState, useEffect, useContext, useMemo } from "react"
import { UserPlus } from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import {
  getLeadReceiverNames, saveLeadReceiverNames,
  getLeadSources, saveLeadSources,
  getNOBs, saveNOBs,
  getDivisions,
  getCompanies, saveCompany, saveCompanies
} from "../utils/storageManager"
import { generateId } from "../utils/helpers"
import LeadAttachmentUpload from "../components/LeadAttachmentUpload"
import LocationPermissionModal from "../../../components/LocationPermissionModal"
import { getCitiesForState, INDIAN_STATES } from "../data/indianStatesAndCities"

function NewLead() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showNotification, currentUser, isAdmin, isSalesPerson } = useContext(AuthContext)
  const [receiverNames, setReceiverNames] = useState([])
  const isUserSalesPerson = isSalesPerson || (!isAdmin()) || (
    currentUser?.username && receiverNames.some(name => name?.toLowerCase() === currentUser.username.toLowerCase())
  )

  const [formData, setFormData] = useState({
    receiverName: currentUser?.username || "",
    salesType: "New Customer", // Internally set to New Customer only
    source: "",
    leadType: "", // New field (Incoming / Outgoing)
    companyName: "",
    phoneNumber: "",
    salespersonName: currentUser?.username || "",
    email: "",
    contactPersons: [{ name: "", designation: "", number: "" }], // New array for contact persons
    state: "", // New field
    city: "", // New field
    address: "", // New field
    nob: "", // New field for Nature of Business
    division: "", // New field for Division, auto-fills from Company Master
    notes: "",
    interaction: "", // New field: how this lead was interacted with (Call/Email/Visit)
    attachment: "", // New field: optional attachment, stored as base64
    attachmentLocation: null // Captured GPS metadata (coords, address, timestamp)
  })
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [leadSources, setLeadSources] = useState([])
  const [companyOptions, setCompanyOptions] = useState([]) // State for company dropdown
  const [companyDetailsMap, setCompanyDetailsMap] = useState({}) // State to store company details
  const [nextLeadNumber, setNextLeadNumber] = useState("")

  useEffect(() => {
    if (isUserSalesPerson && currentUser?.username) {
      setFormData(prev => ({
        ...prev,
        receiverName: currentUser.username,
        salespersonName: currentUser.username
      }))
    }
  }, [isUserSalesPerson, currentUser])

  const [designationOptions, setDesignationOptions] = useState([])
  const [nobOptions, setNobOptions] = useState([]) // New state for nature of business dropdown
  const [divisionOptions, setDivisionOptions] = useState([]) // New state for division dropdown
  const [stateOptions, setStateOptions] = useState(INDIAN_STATES)
  const [isOtherCity, setIsOtherCity] = useState(false)
  const [customCity, setCustomCity] = useState("")

  const cityOptions = useMemo(() => {
    return getCitiesForState(formData.state)
  }, [formData.state])



  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Fetch dropdown data when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch dropdown values from DROPDOWNSHEET
        await fetchDropdownData()
        // Fetch company data for dropdown and auto-fill
        await fetchCompanyData()
      } catch (error) {
        console.error("Error during initial data fetch:", error)
      }
    }

    fetchInitialData()
  }, [])

  // Function to fetch dropdown data from DROPDOWNSHEET & live masters
  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchDropdowns()

      if (data) {
        setStateOptions(data.states || [])
        setDesignationOptions(data.designations || [])
        if (data.receivers && data.receivers.length > 0) {
          setReceiverNames(data.receivers)
        }
        if (data.sources && data.sources.length > 0) setLeadSources(data.sources.map(s => typeof s === "string" ? s : s.name))
        if (data.nobs && data.nobs.length > 0) setNobOptions(data.nobs.map(n => typeof n === "string" ? n : n.name))
        if (data.divisions && data.divisions.length > 0) setDivisionOptions(data.divisions.map(d => typeof d === "string" ? d : d.name))
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
    }

    try {
      setReceiverNames(prev => prev.length > 0 ? prev : getLeadReceiverNames().map(item => item.name))
      setLeadSources(prev => prev.length > 0 ? prev : getLeadSources().map(item => item.name))
      setNobOptions(prev => prev.length > 0 ? prev : getNOBs().map(item => item.name))
      setDivisionOptions(prev => prev.length > 0 ? prev : getDivisions().map(item => item.name))
    } catch (error) {
      console.error("Error loading master dropdown data:", error)
    }
  }

  // Function to fetch company data live from Supabase (with fallback to local cache).
  const fetchCompanyData = async () => {
    try {
      let masterCompanies = []
      try {
        const liveCompanies = await mockApi.fetchCompanies()
        if (liveCompanies && liveCompanies.length > 0) {
          masterCompanies = liveCompanies
          saveCompanies(liveCompanies)
        }
      } catch (liveErr) {
        console.warn("Could not fetch live companies, falling back to cache:", liveErr)
      }

      if (!masterCompanies || masterCompanies.length === 0) {
        masterCompanies = getCompanies()
      }

      if (masterCompanies && masterCompanies.length > 0) {
        const companyNames = []
        const detailsMap = {}

        masterCompanies.forEach(company => {
          if (!company.name) return
          const trimmedName = company.name.trim()
          if (!companyNames.includes(trimmedName)) {
            companyNames.push(trimmedName)
          }
          detailsMap[trimmedName] = {
            id: company.id,
            vnNo: company.vnNo,
            salesPerson: company.contactPersons?.[0]?.name || company.salesPerson || "",
            phoneNumber: company.phone || company.phoneNumber || company.contactPersons?.[0]?.number || "",
            email: company.email || "",
            division: company.division || "",
            state: company.state || "",
            city: company.city || "",
            address: company.address || "",
            nob: company.nob || "",
            gst: company.gst || company.consignorGSTIN || "",
            contactPersons: company.contactPersons || []
          }
        })

        setCompanyOptions(companyNames)
        setCompanyDetailsMap(detailsMap)
      }
    } catch (error) {
      console.error("Error fetching company data:", error)
      setCompanyOptions([])
      setCompanyDetailsMap({})
    }
  }

  const handleChange = (e) => {
    const { id, value } = e.target

    if (id === 'salesType') {
      setIsOtherCity(false)
      setCustomCity("")
      setFormData(prevData => ({
        ...prevData,
        salesType: value,
        companyName: "",
        phoneNumber: "",
        salespersonName: "",
        email: "",
        division: "",
        state: "",
        city: "",
        address: "",
        nob: "",
        contactPersons: [{ name: "", designation: "", number: "" }]
      }))

      if (value === 'Existing Customer') {
        fetchCompanyData()
      }
      return
    }

    if (id === 'state') {
      const nextCities = getCitiesForState(value)
      setIsOtherCity(false)
      setCustomCity("")
      setFormData(prevData => ({
        ...prevData,
        state: value,
        city: nextCities.includes(prevData.city) ? prevData.city : ""
      }))
      return
    }

    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }))

    // Auto-fill related fields if company is selected in Existing Customer mode
    if (id === 'companyName' && value) {
      const companyDetails = companyDetailsMap[value] || {}

      // Company Master's contact persons ({name, designation, number} each)
      // pre-fill the Contact Person Details section — capped at 3 to match
      // this form's own limit.
      const companyContacts = (companyDetails.contactPersons || [])
        .filter(p => p && (p.name || p.designation || p.number))
        .slice(0, 3)
        .map(p => ({ name: p.name || "", designation: p.designation || "", number: p.number || "" }))

      setIsOtherCity(false)
      setCustomCity("")
      setFormData(prevData => ({
        ...prevData,
        companyName: value,
        phoneNumber: companyDetails.phoneNumber || companyContacts[0]?.number || "",
        salespersonName: companyDetails.salesPerson || companyContacts[0]?.name || "",
        email: companyDetails.email || "",
        division: companyDetails.division || "",
        state: companyDetails.state || "",
        city: companyDetails.city || "",
        address: companyDetails.address || "",
        nob: companyDetails.nob || "",
        contactPersons: companyContacts.length > 0
          ? companyContacts
          : [{ name: "", designation: "", number: "" }]
      }))
    } else if (id === 'companyName' && !value) {
      // Company deselected — clear out everything that was auto-filled
      // from the previous selection instead of leaving it stale.
      setFormData(prevData => ({
        ...prevData,
        companyName: "",
        phoneNumber: "",
        salespersonName: "",
        email: "",
        division: "",
        state: "",
        city: "",
        address: "",
        nob: "",
        contactPersons: [{ name: "", designation: "", number: "" }]
      }))
    }
  }

  // Function to handle change in contact person fields
  const handleContactPersonChange = (index, field, value) => {
    const updatedContactPersons = [...formData.contactPersons]
    updatedContactPersons[index] = {
      ...updatedContactPersons[index],
      [field]: value
    }

    setFormData({
      ...formData,
      contactPersons: updatedContactPersons
    })
  }

  // Function to add a new contact person section (max 3)
  const addContactPerson = () => {
    if (formData.contactPersons.length < 3) {
      setFormData({
        ...formData,
        contactPersons: [...formData.contactPersons, { name: "", designation: "", number: "" }]
      })
    }
  }

  // Function to remove a contact person section
  const removeContactPerson = (index) => {
    const updatedContactPersons = [...formData.contactPersons]
    updatedContactPersons.splice(index, 1)

    setFormData({
      ...formData,
      contactPersons: updatedContactPersons
    })
  }

  const generateLeadNumber = async () => {
    try {
      const leadNumber = await mockApi.generateLeadNumber()
      return leadNumber
    } catch (error) {
      console.error("Error generating lead number:", error)
      return "LD-001" // Default if we can't determine
    }
  }


  // Lets the Sales Person Name / Lead Source / NOB fields accept a value
  // typed fresh (not just picked from the list) — on save, anything not
  // already in that Master list gets added there automatically, the same
  // way a "New Customer" company name registers itself in Company Master.
  const addValueToNameMaster = (value, getList, saveList, prefix, noField) => {
    const trimmed = (value || "").trim()
    if (!trimmed) return

    const list = getList()
    const alreadyExists = list.some(item => item.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (alreadyExists) return

    saveList([
      ...list,
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        [noField]: `${prefix}-${String(list.length + 1).padStart(3, '0')}`,
        name: trimmed
      }
    ])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Format current date as dd/mm/yyyy
      const formattedDate = formatDate(new Date())
      const effectiveSalesPerson = (isUserSalesPerson && currentUser?.username)
        ? currentUser.username
        : (formData.receiverName || formData.salespersonName);

      const submissionData = {
        ...formData,
        receiverName: effectiveSalesPerson,
        salespersonName: effectiveSalesPerson,
        date: formattedDate
      }

      const result = await mockApi.submitLead(submissionData)

      if (result.success) {
        // Any freshly-typed Sales Person Name / Lead Source / NOB not
        // already in its Master list gets added there now.
        addValueToNameMaster(formData.receiverName, getLeadReceiverNames, saveLeadReceiverNames, "LRN", "lrnNo")
        addValueToNameMaster(formData.source, getLeadSources, saveLeadSources, "LS", "lsNo")
        addValueToNameMaster(formData.nob, getNOBs, saveNOBs, "NOB", "nobNo")
        await fetchDropdownData()

        // "New Customer" means this company is saved to Supabase leads_companies & Company Master
        if (formData.salesType === "New Customer" && formData.companyName.trim()) {
          const companyPayload = {
            name: formData.companyName.trim(),
            gst: "",
            email: formData.email || "",
            phone: formData.phoneNumber || "",
            address: formData.address || "",
            state: formData.state || "",
            city: formData.city || "",
            nob: formData.nob || "",
            division: formData.division || "",
            contactPersons: formData.contactPersons.filter(p => p.name || p.designation || p.number),
            proof: formData.attachment || ""
          }

          try {
            await mockApi.saveCompany(companyPayload)
          } catch (cErr) {
            console.warn("Could not save company to Supabase:", cErr)
          }
          saveCompany(companyPayload)

          // Refresh so the newly-registered company is immediately
          // available as a Company Name option on this form.
          await fetchCompanyData()
        }

        showNotification("Lead created successfully", "success")
        window.dispatchEvent(new CustomEvent("companies-updated"))
        window.dispatchEvent(new CustomEvent("leads-updated"))

        // Reset form
        setIsOtherCity(false)
        setCustomCity("")
        setFormData({
          receiverName: isUserSalesPerson && currentUser?.username ? currentUser.username : "",
          salesType: "New Customer",
          source: "",
          leadType: "",
          companyName: "",
          phoneNumber: "",
          salespersonName: isUserSalesPerson && currentUser?.username ? currentUser.username : "",
          email: "",
          contactPersons: [{ name: "", designation: "", number: "" }],
          state: "",
          city: "",
          address: "",
          nob: "",
          division: "",
          notes: "",
          interaction: "",
          attachment: "",
          attachmentLocation: null
        })
      } else {
        showNotification("Error creating lead: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      showNotification("Error submitting form: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <UserPlus size={22} />
            </div>
            New Lead
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Register incoming or outgoing sales inquiries and customer contact information
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Lead Information Form</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Please provide accurate contact and inquiry details</p>
          {nextLeadNumber && (
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1.5">
              Next Lead Number: {nextLeadNumber}
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="receiverName" className="block text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Sales Person Name <span className="text-rose-500">*</span></span>
                  {isUserSalesPerson && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">(Auto-Filled)</span>
                  )}
                </label>
                {(!isAdmin() && isUserSalesPerson) ? (
                  <input
                    type="text"
                    id="receiverName"
                    value={formData.receiverName || currentUser?.username || ""}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 font-semibold cursor-not-allowed select-none text-sm"
                  />
                ) : (
                  <select
                    id="receiverName"
                    value={formData.receiverName || (isUserSalesPerson ? (currentUser?.username || "") : "")}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select sales person name</option>
                    {(formData.receiverName || (isUserSalesPerson ? currentUser?.username : "")) &&
                      !receiverNames.includes(formData.receiverName || currentUser?.username) && (
                      <option value={formData.receiverName || currentUser?.username}>
                        {formData.receiverName || currentUser?.username}
                      </option>
                    )}
                    {receiverNames.map((name, index) => (
                      <option key={index} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>


              <div className="space-y-2">
                <label htmlFor="interaction" className="block text-sm font-medium text-gray-700">
                  Interaction
                </label>
                <select
                  id="interaction"
                  value={formData.interaction}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select interaction type</option>
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Visit">Visit</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                  Lead Source
                </label>
                <select
                  id="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select lead source</option>
                  {formData.source && !leadSources.includes(formData.source) && (
                    <option value={formData.source}>{formData.source}</option>
                  )}
                  {leadSources.map((source, index) => (
                    <option key={index} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="leadType" className="block text-sm font-medium text-gray-700">
                  Lead Type
                </label>
                <select
                  id="leadType"
                  value={formData.leadType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select lead type</option>
                  <option value="Incoming">Incoming</option>
                  <option value="Outgoing">Outgoing</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                {formData.salesType === "New Customer" ? (
                  <>
                    <input
                      id="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new company name"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      New company — will be added to Company Master on save.
                    </p>
                  </>
                ) : (
                  <select
                    id="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select company</option>
                    {companyOptions.map((company, index) => (
                      <option key={index} value={company}>{company}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="division" className="block text-sm font-medium text-gray-700">
                  Division
                </label>
                <select
                  id="division"
                  value={formData.division}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select division</option>
                  {divisionOptions.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="nob" className="block text-sm font-medium text-gray-700">
                  Nature of Business (NOB)
                </label>
                <select
                  id="nob"
                  value={formData.nob}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select nature of business</option>
                  {formData.nob && !nobOptions.includes(formData.nob) && (
                    <option value={formData.nob}>{formData.nob}</option>
                  )}
                  {nobOptions.map((option, index) => (
                    <option key={index} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email will auto-fill"
                // readOnly={formData.companyName !== ""}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <select
                  id="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select state</option>
                  {stateOptions.map((state, index) => (
                    <option key={index} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <select
                  id="city"
                  value={isOtherCity ? "Other" : formData.city}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === "Other") {
                      setIsOtherCity(true)
                      setCustomCity("")
                      setFormData(prev => ({ ...prev, city: "" }))
                    } else {
                      setIsOtherCity(false)
                      setCustomCity("")
                      handleChange(e)
                    }
                  }}
                  disabled={!formData.state}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="">{formData.state ? "Select city" : "Select state first"}</option>
                  {formData.city && !isOtherCity && !cityOptions.includes(formData.city) && (
                    <option value={formData.city}>{formData.city}</option>
                  )}
                  {cityOptions.map((city, index) => (
                    <option key={index} value={city}>{city}</option>
                  ))}
                  {formData.state && <option value="Other">Other (Enter Manually)</option>}
                </select>

                {isOtherCity && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">Enter City Name</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtherCity(false)
                          setCustomCity("")
                          setFormData(prev => ({ ...prev, city: "" }))
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        ← Select from list
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customCity}
                      onChange={(e) => {
                        const val = e.target.value
                        setCustomCity(val)
                        setFormData(prev => ({ ...prev, city: val }))
                      }}
                      placeholder="Type city name"
                      className="w-full px-3 py-2 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Address Field */}
            <div className="space-y-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter complete address"
                rows="2"
              // required
              />
            </div>

            {/* Contact Person Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">Contact Person Details</h3>
                {formData.contactPersons.length < 3 && (
                  <button
                    type="button"
                    onClick={addContactPerson}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add Person
                  </button>
                )}
              </div>

              {formData.contactPersons.map((person, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Person {index + 1}</h4>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeContactPerson(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        value={person.name}
                        onChange={(e) => handleContactPersonChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contact name"
                      // required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Designation</label>
                      <select
                        value={person.designation}
                        onChange={(e) => handleContactPersonChange(index, 'designation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        required
                      >
                        <option value="">Select designation</option>
                        {person.designation && !designationOptions.includes(person.designation) && (
                          <option value={person.designation}>{person.designation}</option>
                        )}
                        {designationOptions.map((designation, idx) => (
                          <option key={idx} value={designation}>{designation}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <input
                        value={person.number}
                        onChange={(e) => handleContactPersonChange(index, 'number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contact number"
                      // required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <input
                id="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any additional information"
              />
            </div>

            <div className="space-y-2">
              <LeadAttachmentUpload
                id="new-lead-attachment"
                label="Attachment"
                value={formData.attachment}
                locationValue={formData.attachmentLocation}
                onChange={(base64, locationMeta) => {
                  setFormData(prev => ({
                    ...prev,
                    attachment: base64,
                    attachmentLocation: locationMeta
                  }))
                }}
                onClear={() => {
                  setFormData(prev => ({
                    ...prev,
                    attachment: "",
                    attachmentLocation: null
                  }))
                }}
                onRequestLocationModal={() => setShowLocationModal(true)}
                buttonText="Browse file"
              />
            </div>
          </div>
          <div className="p-6 md:p-8 border-t border-gray-100 dark:border-slate-800 flex justify-end bg-gray-50/50 dark:bg-slate-900/50">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving Lead..." : "Save Lead"}
            </button>
          </div>
        </form>
      </div>

      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
    </div>
  )
}

export default NewLead