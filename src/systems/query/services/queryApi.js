import supabase from "../../../SupabaseClient";

/**
 * Fetch all users from master table (users)
 */
export async function fetchMasterUsers() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("user_name")
      .not("user_name", "is", null)
      .neq("user_name", "")
      .order("user_name", { ascending: true });

    if (error) {
      console.error("Error fetching master users:", error);
      return [];
    }
    const names = Array.from(new Set((data || []).map((u) => (u.user_name || "").trim()).filter(Boolean)));
    names.sort((a, b) => a.localeCompare(b));
    return names;
  } catch (err) {
    console.error("Unexpected error in fetchMasterUsers:", err);
    return [];
  }
}

/**
 * Fetch tickets raised by or on behalf of or assigned to a specific user
 * @param {string} username
 */
export async function fetchUserQueries(username) {
  try {
    if (!username) return { data: [], error: null };

    // Try query with reported_for and assigned_to if columns exist
    const { data, error } = await supabase
      .from("query_tickets")
      .select("*")
      .or(`reported_by.eq.${username},reported_for.eq.${username},assigned_to.eq.${username}`)
      .order("reported_date", { ascending: false });

    if (error) {
      // Fallback query if columns do not exist in postgres schema
      const fallback = await supabase
        .from("query_tickets")
        .select("*")
        .order("reported_date", { ascending: false });

      if (!fallback.error) {
        const filtered = (fallback.data || []).filter((t) => {
          let meta = {};
          try {
            meta = JSON.parse(t.resolution_notes) || {};
          } catch (e) {
            void e;
          }
          const rFor = t.reported_for || meta.reported_for;
          const aTo = t.assigned_to || meta.assigned_to;
          return t.reported_by === username || rFor === username || aTo === username;
        });
        return { data: filtered, error: null };
      }
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
      reported_for: ticketData.reported_for || null,
      assigned_to: ticketData.assigned_to || null,
    };

    let { data, error } = await supabase
      .from("query_tickets")
      .insert([payload])
      .select()
      .single();

    if (error && (error.message?.includes("reported_for") || error.message?.includes("assigned_to"))) {
      // Seamless fallback if columns haven't been added yet in postgres schema
      const fallbackPayload = {
        ...payload,
        resolution_notes: JSON.stringify({
          reported_for: ticketData.reported_for || null,
          assigned_to: ticketData.assigned_to || null,
        }),
      };
      delete fallbackPayload.reported_for;
      delete fallbackPayload.assigned_to;

      const res = await supabase
        .from("query_tickets")
        .insert([fallbackPayload])
        .select()
        .single();
      data = res.data;
      error = res.error;
    }

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

/**
 * Update the assignee of a query ticket
 * @param {number|string} id
 * @param {string} assignedTo
 * @param {string} updatedBy
 */
export async function updateQueryAssignee(id, assignedTo, updatedBy) {
  try {
    const updatePayload = {
      assigned_to: assignedTo || null,
      updated_by: updatedBy || localStorage.getItem("user-name") || "Admin",
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from("query_tickets")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error && error.message?.includes("assigned_to")) {
      // Fallback: fetch current resolution_notes, merge assigned_to, update
      const { data: current } = await supabase
        .from("query_tickets")
        .select("resolution_notes")
        .eq("id", id)
        .single();

      let meta = {};
      try {
        meta = JSON.parse(current?.resolution_notes) || {};
      } catch (e) {
        void e;
      }
      meta.assigned_to = assignedTo || null;

      const fallbackRes = await supabase
        .from("query_tickets")
        .update({
          resolution_notes: JSON.stringify(meta),
          updated_by: updatedBy || localStorage.getItem("user-name") || "Admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error("Error updating query assignee:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error in updateQueryAssignee:", err);
    return { data: null, error: err };
  }
}
