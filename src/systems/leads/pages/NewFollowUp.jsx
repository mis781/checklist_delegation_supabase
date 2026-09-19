  import { useState, useContext, useEffect } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { PhoneCall, ArrowLeft } from "lucide-react"
import { AuthContext } from "../context/AuthContext"
import { mockApi } from "../services/mockApi"
import { getUOMs, getCreditDays, getCreditLimits } from "../utils/storageManager"
import { fileToBase64 } from "../utils/helpers"

function NewFollowUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const companyContext = location.state?.companyContext
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get("leadId")
  const leadNo = searchParams.get("leadNo")
  const { currentUser, showNotification } = useContext(AuthContext)
  const [customerFeedbackOptions, setCustomerFeedbackOptions] = useState([
    "Interested",
    "Not Interested",
    "Asked for Quotation",
    "Callback Later"
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enquiryStatus, setEnquiryStatus] = useState("")
  const [items, setItems] = useState([{ id: "1", name: "", uom: "", quantity: "" }])

  const addItem = () => {
    const MAX_ITEMS = 300
    if (items.length < MAX_ITEMS) {
      const newId = (items.length + 1).toString()
      setItems([...items, { id: newId, name: "", uom: "", quantity: "" }])
    }
  }

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }
  const [formData, setFormData] = useState({
    leadNo: "",
    nextAction: "",
    nextCallDate: "",
    nextCallTime: "",
    customerFeedback: "",
    interaction: "",
    billingAddress: "",
    shippingAddress: "",
    freightType: "",
    gst: "",
    creditAccess: "",
    creditDays: "",
    creditLimit: "",
    attachment: "", // New attachment uploaded for this follow-up call
  })

  // Pre-filled from the lead's original details once fetched
  const [enquiryState, setEnquiryState] = useState("")
  const [nob, setNob] = useState("")
  const [city, setCity] = useState("")
  const [division, setDivision] = useState("")

  // New state for dropdown options
  const [productCategories, setProductCategories] = useState([]) // New state for product categories
  const [nobOptions, setNobOptions] = useState([])
  const [uomOptions, setUomOptions] = useState([])
  const [creditDaysOptions, setCreditDaysOptions] = useState([])
  const [creditLimitOptions, setCreditLimitOptions] = useState([])

  // Function to fetch dropdown data from DROPDOWNSHEET
  // Function to fetch dropdown data from DROPDOWNSHEET
  // Function to fetch dropdown data from DROPDOWNSHEET
  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchDropdowns()

      if (data) {
        // Using some default mappings for other dropdowns as they might not be in the initial simplified mockApi response
        // In a real scenario, mockApi.fetchDropdowns should return all these.
        setProductCategories(["Product 1", "Product 2", "Product 3"])
        setNobOptions(data.nobs || [])
        setCustomerFeedbackOptions(["Interested", "Not Interested", "Asked for Quotation", "Callback Later"])
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
      // Fallback values
      setProductCategories(["Product 1", "Product 2", "Product 3"])
      setNobOptions(["NOB 1", "NOB 2", "NOB 3"])
    }

    // UOM, Credit Days & Credit Limit are managed from the Master module
    try {
      setUomOptions(getUOMs().map(item => item.name))
      setCreditDaysOptions(getCreditDays().map(item => item.name))
      setCreditLimitOptions(getCreditLimits().map(item => item.name))
    } catch (error) {
      console.error("Error loading master dropdown data:", error)
    }
  }

  useEffect(() => {
    // Fetch dropdown data when component mounts
    fetchDropdownData()

    if (companyContext) {
      // Pre-fill fields from the company context (Enquiry flow)
      if (companyContext.state) setEnquiryState(companyContext.state)
      if (companyContext.nob) setNob(companyContext.nob)
      if (companyContext.city) setCity(companyContext.city)
      if (companyContext.division) setDivision(companyContext.division)
      setFormData((prevData) => ({
        ...prevData,
        leadNo: "Generating...",
      }))

      // Preview the Lead No. this enquiry will get so it shows here right
      // away — this only reads the next available number, it doesn't save
      // anything, so the lead itself isn't actually created (and doesn't
      // occupy that number) until the follow-up below is submitted.
      mockApi.generateLeadNumber().then((previewLeadNumber) => {
        setFormData((prevData) => ({
          ...prevData,
          leadNo: previewLeadNumber,
        }))
      }).catch((error) => {
        console.error("Error previewing lead number:", error)
      })
    } else if (leadNo) {
      // Prepopulate lead number if available
      setFormData((prevData) => ({
        ...prevData,
        leadNo: leadNo,
      }))

      // Pre-fill Enquiry for State / NOB / City / Division from the lead's original details
      mockApi.fetchLeadByNumber(leadNo).then((result) => {
        if (result.success && result.lead) {
          if (result.lead.state) setEnquiryState(result.lead.state)
          if (result.lead.nob) setNob(result.lead.nob)
          if (result.lead.city) setCity(result.lead.city)
          if (result.lead.division) setDivision(result.lead.division)
        }
      }).catch((error) => {
        console.error("Error fetching lead details for pre-fill:", error)
      })
    }
  }, [leadNo])

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }))
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
      setFormData((prevData) => ({ ...prevData, attachment: base64 }))
    } catch (error) {
      showNotification("Could not read the selected file. Please try again.", "error")
    }
  }

  // The combined "Next Call Date & Time" input splits back into the
  // separate nextCallDate/nextCallTime fields the rest of the form (and the
  // saved history record) already uses.
  const handleNextCallDateTimeChange = (e) => {
    const [date, time] = e.target.value.split("T")
    setFormData((prevData) => ({
      ...prevData,
      nextCallDate: date || "",
      nextCallTime: time || "",
    }))
  }

  const calculateTotalQuantity = () => {
    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0
      return total + quantity
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Its Lead No. is only a preview until now (see the companyContext
    // effect above) — if that preview call is still in flight, make the
    // user wait for it instead of submitting against a placeholder.
    if (companyContext && formData.leadNo === "Generating...") {
      showNotification("Still generating the lead number, please wait a moment.", "error")
      return
    }

    setIsSubmitting(true)

    try {
      let finalLeadNo = formData.leadNo;

      if (companyContext) {
        // The enquiry lead itself is only created now, on Submit — not when
        // the form opened — using the same number already previewed above,
        // so the lead doesn't get raised (and its number doesn't get
        // consumed) if the user navigates away without submitting.
        const leadResult = await mockApi.createEnquiryLead(companyContext, currentUser?.username, finalLeadNo);
        if (leadResult.success) {
          finalLeadNo = leadResult.leadNumber;
        } else {
          throw new Error("Failed to create enquiry lead.");
        }
      }

      const currentDate = new Date()
      const formattedDate = formatDate(currentDate)

      // Prepare base row data (columns A-E)
      const rowData = [
        formattedDate, // A: Current date
        finalLeadNo, // B: Lead Number
        formData.customerFeedback, // C: Customer feedback
        "", // D: (Lead Status removed)
        enquiryStatus, // E: Enquiry Status
      ]

      // Handle different scenarios
      if (enquiryStatus === "expected") {
        // Explicitly add columns F-K as empty (6 empty columns)
        rowData.push("", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "")

        // Then add columns V, W, X
        rowData.push(
          formData.nextAction, // V: Next action
          formData.nextCallDate, // W: Next call date
          formData.nextCallTime, // X: Next call time
        )
      }
      else if (enquiryStatus === "yes") {
        // Add columns F-K
        rowData.push(
          formattedDate, // F: Enquiry Received Date (Order Received Date field removed — uses today's date)
          enquiryState, // G: Enquiry for State
          nob, // H: Project Name (NOB)
          "", // I: (Enquiry Type removed)
          "", // J: (Enquiry Approach removed)
          "", // K: Project Value (empty)
        )

        // Handle first 5 items (columns L-U)
        const first5Items = items.slice(0, 5)

        // Add first 5 items in pairs (name, quantity)
        first5Items.forEach((item) => {
          rowData.push(item.name || "") // Product category
          rowData.push(item.quantity || "0") // Quantity (0 if null/empty)
        })

        // If less than 5 items, fill remaining slots with empty values
        const remainingSlots = 5 - first5Items.length
        for (let i = 0; i < remainingSlots; i++) {
          rowData.push("", "0") // Empty name and 0 quantity
        }

        // Pad to reach column AB (index 27)
        while (rowData.length < 27) {
          rowData.push("")
        }

        // Column AB (index 27): (Leads Tracking Status removed)
        rowData.push("")

        // Handle items 6 and onwards as JSON in column AC (index 28)
        if (items.length > 5) {
          const additionalItems = items.slice(5).map(item => ({
            name: item.name || "",
            quantity: item.quantity || "0"
          }))
          rowData.push(JSON.stringify(additionalItems)) // Column AC
        } else {
          rowData.push("") // Empty if no additional items
        }

        // Add total quantity in column AD (index 29)
        rowData.push(calculateTotalQuantity().toString())

      } else if (enquiryStatus === "not-interested") {
        // Pad columns F-K and then V-X with empty values
        rowData.push("", "", "", "", "", "", "", "", "")
      }

      console.log("Row Data to be submitted:", rowData)

      // Send the data
      const result = await mockApi.submitFollowUp({
        ...formData,
        leadNo: finalLeadNo,
        enquiryStatus,
        enquiryState,
        nob,
        city,
        division,
        items,
        rowData // Keeping raw rowData for structure if needed by mockApi later, or better yet pass structured data
      })

      if (result.success) {
        showNotification("Follow-up recorded successfully", "success")
        navigate("/dashboard/leads/followup-tracker")
      } else {
        showNotification("Error recording follow-up: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      showNotification("Error submitting form: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <div className="w-full space-y-6 py-2 md:py-4 theme-transition">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <PhoneCall size={22} />
            </div>
            Record Follow-Up Call
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Log customer interaction feedback, next call schedule, and quotation request items
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={14} /> Back to Followup Tracker
        </button>
      </div>

      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Follow-Up Form Details</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Record details of the follow-up call
            {leadId && <span className="font-bold text-blue-600 dark:text-blue-400"> for Lead #{leadId}</span>}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <label htmlFor="leadNo" className="block text-sm font-medium text-gray-700">
                Lead No.
              </label>
              <input
                id="leadNo"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${companyContext ? "bg-gray-100 text-gray-500" : ""}`}
                placeholder="LD-001"
                value={formData.leadNo}
                onChange={handleChange}
                required
                readOnly={!!companyContext}
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
                      : "bg-gray-50 border-gray-300 text-gray-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
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
                    onClick={() => setFormData((prevData) => ({ ...prevData, attachment: "" }))}
                    className="px-3 py-2 text-sm text-red-500 hover:text-red-700 border border-gray-300 rounded-md"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="customerFeedback" className="block text-sm font-medium text-gray-700">
                What did the customer say?
              </label>
              <select
                id="customerFeedback"
                value={formData.customerFeedback}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                required
              >
                <option value="">Select customer feedback</option>
                {formData.customerFeedback && !customerFeedbackOptions.includes(formData.customerFeedback) && (
                  <option value={formData.customerFeedback}>{formData.customerFeedback}</option>
                )}
                {customerFeedbackOptions.map((feedback, index) => (
                  <option key={index} value={feedback}>{feedback}</option>
                ))}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select interaction type</option>
                <option value="Call">Call</option>
                <option value="WP">WP</option>
                <option value="Visit">Visit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Enquiry Received Status</label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="yes"
                    name="enquiryStatus"
                    value="yes"
                    checked={enquiryStatus === "yes"}
                    onChange={() => setEnquiryStatus("yes")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="yes" className="text-sm text-gray-700 dark:text-slate-300">
                    Make Quotation
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="expected"
                    name="enquiryStatus"
                    value="expected"
                    checked={enquiryStatus === "expected"}
                    onChange={() => setEnquiryStatus("expected")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="expected" className="text-sm text-gray-700 dark:text-slate-300">
                    Expected
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="not-interested"
                    name="enquiryStatus"
                    value="not-interested"
                    checked={enquiryStatus === "not-interested"}
                    onChange={() => setEnquiryStatus("not-interested")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="not-interested" className="text-sm text-gray-700 dark:text-slate-300">
                    Not Interested
                  </label>
                </div>
              </div>
            </div>

            {enquiryStatus === "expected" && (
              <div className="space-y-4 border p-4 rounded-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
                <div className="space-y-2">
                  <label htmlFor="nextAction" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Next Action
                  </label>
                  <input
                    id="nextAction"
                    value={formData.nextAction}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    placeholder="Enter next action"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="nextCallDateTime" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Next Call Date & Time
                  </label>
                  <input
                    id="nextCallDateTime"
                    type="datetime-local"
                    value={formData.nextCallDate && formData.nextCallTime ? `${formData.nextCallDate}T${formData.nextCallTime}` : ""}
                    onChange={handleNextCallDateTimeChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    required
                  />
                </div>
              </div>
            )}

            {enquiryStatus === "yes" && (
              <div className="space-y-4 border p-4 rounded-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Quotation Items</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Specify products and quantities requested for this quotation</p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    disabled={items.length >= 300}
                  >
                    + Add Item ({items.length}/300)
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50/70 dark:bg-slate-800/40 p-3 rounded-xl border border-gray-200 dark:border-slate-700/60">
                      <div className="md:col-span-6 space-y-1">
                        <label htmlFor={`itemName-${item.id}`} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                          Item Name {index + 1}
                        </label>
                        <input
                          id={`itemName-${item.id}`}
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Select or type item name"
                          list="products"
                          required
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1">
                        <label htmlFor={`uom-${item.id}`} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                          UOM
                        </label>
                        <select
                          id={`uom-${item.id}`}
                          value={item.uom}
                          onChange={(e) => updateItem(item.id, "uom", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          required
                        >
                          <option value="">Select UOM</option>
                          {uomOptions.map((uom, i) => (
                            <option key={i} value={uom}>
                              {uom}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label htmlFor={`quantity-${item.id}`} className="block text-xs font-semibold text-gray-700 dark:text-slate-300">
                          Quantity
                        </label>
                        <input
                          id={`quantity-${item.id}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Qty"
                          min="1"
                          required
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-center pb-1">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-6 md:p-8 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving Follow-Up..." : "Submit Follow-Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewFollowUp
