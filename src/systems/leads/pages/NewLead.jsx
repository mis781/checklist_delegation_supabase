import { useState, useEffect, useContext } from "react"
import { UserPlus } from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import {
  getLeadReceiverNames, saveLeadReceiverNames,
  getLeadSources, saveLeadSources,
  getNOBs, saveNOBs,
  getDivisions,
  getCompanies, saveCompany
} from "../utils/storageManager"
import { fileToBase64, generateId } from "../utils/helpers"

function NewLead() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    receiverName: "",
    salesType: "", // New field
    source: "",
    leadType: "", // New field (Incoming / Outgoing)
    companyName: "",
    phoneNumber: "",
    salespersonName: "",
    email: "",
    contactPersons: [{ name: "", designation: "", number: "" }], // New array for contact persons
    state: "", // New field
    city: "", // New field
    address: "", // New field
    nob: "", // New field for Nature of Business
    division: "", // New field for Division, auto-fills from Company Master
    notes: "",
    interaction: "", // New field: how this lead was interacted with (Call/WP/Visit)
    attachment: "" // New field: optional attachment, stored as base64
  })
  const [receiverNames, setReceiverNames] = useState([])
  const [leadSources, setLeadSources] = useState([])
  const [companyOptions, setCompanyOptions] = useState([]) // State for company dropdown
  const [companyDetailsMap, setCompanyDetailsMap] = useState({}) // State to store company details
  const [nextLeadNumber, setNextLeadNumber] = useState("")
  const { showNotification } = useContext(AuthContext)
  const [designationOptions, setDesignationOptions] = useState([])
  const [nobOptions, setNobOptions] = useState([]) // New state for nature of business dropdown
  const [divisionOptions, setDivisionOptions] = useState([]) // New state for division dropdown
  const [stateOptions, setStateOptions] = useState([])



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

  // Function to fetch dropdown data from DROPDOWNSHEET
  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchDropdowns()

      if (data) {
        setStateOptions(data.states || [])
        setDesignationOptions(data.designations || [])
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
    }

    // Lead Receiver Name, Lead Source, NOB & Division are managed from the
    // Master module, so pull their live values from there.
    try {
      setReceiverNames(getLeadReceiverNames().map(item => item.name))
      setLeadSources(getLeadSources().map(item => item.name))
      setNobOptions(getNOBs().map(item => item.name))
      setDivisionOptions(getDivisions().map(item => item.name))
    } catch (error) {
      console.error("Error loading master dropdown data:", error)
    }
  }

  // Function to fetch company data from the Company Master. Company records
  // (including Division) are managed from the Master module, so pull their
  // live values from there instead of the static mock list.
  const fetchCompanyData = async () => {
    try {
      const masterCompanies = getCompanies()

      if (masterCompanies && masterCompanies.length > 0) {
        const companyNames = []
        const detailsMap = {}

        masterCompanies.forEach(company => {
          companyNames.push(company.name)
          detailsMap[company.name] = {
            salesPerson: company.contactPersons?.[0]?.name || "",
            phoneNumber: company.phone || "",
            email: company.email || "",
            division: company.division || "",
            state: company.state || "",
            city: company.city || "",
            address: company.address || "",
            nob: company.nob || "",
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
    setFormData(prevData => ({
      ...prevData,
      [id]: value
    }))

    // Auto-fill related fields if company is selected
    if (id === 'companyName' && value) {
      const companyDetails = companyDetailsMap[value] || {}

      // Company Master's contact persons ({name, designation, number} each)
      // pre-fill the Contact Person Details section — capped at 3 to match
      // this form's own limit.
      const companyContacts = (companyDetails.contactPersons || [])
        .filter(p => p.name || p.designation || p.number)
        .slice(0, 3)
        .map(p => ({ name: p.name || "", designation: p.designation || "", number: p.number || "" }))

      setFormData(prevData => ({
        ...prevData,
        companyName: value,
        phoneNumber: companyDetails.phoneNumber || "",
        salespersonName: companyDetails.salesPerson || "",
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

  // Reads the selected file and stores it as a base64 data URL on formData
  const handleAttachmentChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showNotification("Please upload a file smaller than 2MB.", "error")
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setFormData(prevData => ({ ...prevData, attachment: base64 }))
    } catch (error) {
      showNotification("Could not read the selected file. Please try again.", "error")
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

      // Generate the next lead number at submission time
      // const leadNumber = await generateLeadNumber()

      const submissionData = {
        ...formData,
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

        // "New Customer" means this company doesn't exist in Company Master
        // "New Customer" means this company might not exist in Company Master
        // yet — register/merge it there now so it shows up in Master > Company
        // Details and is available as a Company Name option going forward.
        if (formData.salesType === "New Customer" && formData.companyName.trim()) {
          saveCompany({
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
          })

          // Refresh so the newly-registered company is immediately
          // available as a Company Name option on this form.
          await fetchCompanyData()
        }

        showNotification("Lead created successfully", "success")
        window.dispatchEvent(new CustomEvent("leads-updated"))

        // Reset form
        setFormData({
          receiverName: "",
          salesType: "",
          source: "",
          leadType: "",
          companyName: "",
          phoneNumber: "",
          salespersonName: "",
          email: "",
          contactPersons: [{ name: "", designation: "", number: "" }],
          state: "",
          city: "",
          address: "",
          nob: "",
          division: "",
          notes: "",
          interaction: "",
          attachment: ""
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
                <label htmlFor="receiverName" className="block text-sm font-medium text-gray-700">
                  Sales Person Name
                </label>
                <select
                  id="receiverName"
                  value={formData.receiverName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select sales person name</option>
                  {formData.receiverName && !receiverNames.includes(formData.receiverName) && (
                    <option value={formData.receiverName}>{formData.receiverName}</option>
                  )}
                  {receiverNames.map((name, index) => (
                    <option key={index} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="salesType" className="block text-sm font-medium text-gray-700">
                  Sales Type
                </label>
                <select
                  id="salesType"
                  value={formData.salesType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select sales type</option>
                  <option value="New Customer">New Customer</option>
                  <option value="Existing Customer">Existing Customer</option>
                </select>
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
                  <option value="WP">WP</option>
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
                <input
                  id="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter city"
                />
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
              <label htmlFor="attachment" className="block text-sm font-medium text-gray-700">
                Attachment
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div
                    className={`flex items-center justify-center gap-2 border border-dashed rounded-md px-3 py-2 text-sm transition-colors ${formData.attachment
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-gray-50 border-gray-300 text-gray-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                  >
                    {formData.attachment ? "File attached" : "Browse file"}
                  </div>
                  <input
                    id="attachment"
                    type="file"
                    onChange={handleAttachmentChange}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                </label>
                {formData.attachment && (
                  <button
                    type="button"
                    onClick={() => setFormData(prevData => ({ ...prevData, attachment: "" }))}
                    className="px-3 py-2 text-sm text-red-500 hover:text-red-700 border border-gray-300 rounded-md"
                  >
                    Remove
                  </button>
                )}
              </div>
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
    </div>
  )
}

export default NewLead