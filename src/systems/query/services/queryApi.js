import supabase from "../../../SupabaseClient";

/**
 * Fetch tickets raised by a specific user
 * @param {string} username
 */
export async function fetchUserQueries(username) {
  try {
    if (!username) return { data: [], error: null };

    const { data, error } = await supabase
      .from("query_tickets")
      .select("*")
      .eq("reported_by", username)
      .order("reported_date", { ascending: false });

    if (error) {
      console.error("Error fetching user queries:", error);
      return { data: [], error };
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error("Unexpected error in fetchUserQueries:", err);
    return { data: [], error: err };
  }
}

/**
 * Fetch all tickets (for admins / users with full tracker access)
 */
export async function fetchAllQueries() {
  try {
    const { data, error } = await supabase
      .from("query_tickets")
      .select("*")
      .order("reported_date", { ascending: false });

    if (error) {
      console.error("Error fetching all queries:", error);
      return { data: [], error };
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error("Unexpected error in fetchAllQueries:", err);
    return { data: [], error: err };
  }
}

/**
 * Create a new query ticket
 * @param {Object} ticketData
 */
export async function createQueryTicket(ticketData) {
  try {
    const payload = {
      reported_by: ticketData.reported_by,
      reporter_email: ticketData.reporter_email || null,
      system_name: ticketData.system_name,
      system_key: ticketData.system_key || null,
      stage: ticketData.stage,
      stage_id: ticketData.stage_id || null,
      problem_description: ticketData.problem_description,
      expected_solution: ticketData.expected_solution,
      expected_completion_date: ticketData.expected_completion_date,
      reported_date: new Date().toISOString(),
      status: "Pending",
    };

    const { data, error } = await supabase
      .from("query_tickets")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error creating query ticket:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error in createQueryTicket:", err);
    return { data: null, error: err };
  }
}

/**
 * Update the status of a query ticket (restricted to authorized editors)
 * @param {number|string} id
 * @param {string} status
 * @param {string} updatedBy
 * @param {string} [resolutionNotes]
 */
export async function updateQueryStatus(id, status, updatedBy, resolutionNotes = null) {
  try {
    const updatePayload = {
      status,
      updated_by: updatedBy || localStorage.getItem("user-name") || "Admin",
      updated_at: new Date().toISOString(),
    };

    if (resolutionNotes !== null && resolutionNotes !== undefined) {
      updatePayload.resolution_notes = resolutionNotes;
    }

    const { data, error } = await supabase
      .from("query_tickets")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating query status:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error in updateQueryStatus:", err);
    return { data: null, error: err };
  }
}
