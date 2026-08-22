import supabase from "../../SupabaseClient";

// Helper to parse JSON strings if accidentally stored as such
const parseJsonIfNeeded = (val) => {
  if (typeof val === 'string' && val.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(val);
      return parsed.given_by || parsed.name || parsed.user_name || val;
    } catch (e) {
      return val;
    }
  }
  return val;
};

// Fetch unique checklist tasks — one row per unique task_description + name combination
export const fetchChecklistData = async (page = 0, pageSize = 50, nameFilter = '', dateFilter = 'all', departmentFilter = '', givenByFilter = '', doerFilter = '', freqFilter = '') => {
  try {
    const FETCH_LIMIT = 10000;
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const username = localStorage.getItem("user-name");

    let query = supabase
      .from('checklist')
      .select('*')
      .is('submission_date', null)
      .order('task_start_date', { ascending: true })
      .limit(FETCH_LIMIT);

    if (role === 'hod' && username) {
      const { data: reports } = await supabase
        .from("users")
        .select("user_name")
        .eq("reported_by", username);
      const reportingUsers = [username, ...(reports?.map(r => r.user_name) || [])];
      query = query.in('name', reportingUsers);
    } else if (role === 'user' && username) {
      query = query.eq('name', username);
    }

    if (nameFilter) {
      query = query.or(`task_description.ilike.%${nameFilter}%,name.ilike.%${nameFilter}%`);
    }
    
    if (departmentFilter) {
      query = query.eq('department', departmentFilter);
    }
    if (givenByFilter) {
      query = query.eq('given_by', givenByFilter);
    }
    if (doerFilter) {
      query = query.eq('name', doerFilter);
    }
    if (freqFilter) {
      query = query.eq('frequency', freqFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Error when fetching data", error);
      return { data: [], total: 0 };
    }

    // Deduplicate: keep only first occurrence of each task_description + name combo
    const seen = new Set();
    const uniqueRows = (data || []).filter(row => {
      const key = `${(row.division || '').trim()}::${(row.department || '').trim()}::${(row.task_description || '').trim()}::${(row.name || '').trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const mapped = uniqueRows.map(row => ({
      ...row,
      id: row.task_id,
      given_by: parseJsonIfNeeded(row.given_by),
      name: parseJsonIfNeeded(row.name),
      rawName: row.name
    }));

    // Paginate the deduplicated result
    const start = page * pageSize;
    const paginated = mapped.slice(start, start + pageSize);

    // Resolve the latest planned_date for each task in the current page slice by querying Supabase
    const paginatedWithLastDate = await Promise.all(
      paginated.map(async (row) => {
        try {
          const { data: latestData } = await supabase
            .from('checklist')
            .select('planned_date')
            .eq('department', row.department)
            .eq('task_description', row.task_description)
            .eq('name', row.rawName)
            .is('submission_date', null)
            .order('task_start_date', { ascending: false })
            .limit(1);

          return {
            ...row,
            planned_date: latestData?.[0]?.planned_date || row.planned_date
          };
        } catch (err) {
          console.error("Error fetching latest planned date for task:", err);
          return row;
        }
      })
    );

    return {
      data: paginatedWithLastDate,
      total: mapped.length
    };

  } catch (error) {
    console.log("Error from Supabase", error);
    return { data: [], total: 0 };
  }
};

// Fetch unique delegation tasks — one row per unique task_description + name combination
export const fetchDelegationData = async (page = 0, pageSize = 50, nameFilter = '', dateFilter = 'all', departmentFilter = '', givenByFilter = '', doerFilter = '', freqFilter = '') => {
  try {
    const FETCH_LIMIT = 10000;
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const username = localStorage.getItem("user-name");

    let query = supabase
      .from('delegation')
      .select('*')
      .is('submission_date', null)
      .order('task_start_date', { ascending: true })
      .limit(FETCH_LIMIT);

    if (role === 'hod' && username) {
      const { data: reports } = await supabase
        .from("users")
        .select("user_name")
        .eq("reported_by", username);
      const reportingUsers = [username, ...(reports?.map(r => r.user_name) || [])];
      query = query.in('name', reportingUsers);
    } else if (role === 'user' && username) {
      query = query.eq('name', username);
    }

    if (nameFilter) {
      query = query.or(`task_description.ilike.%${nameFilter}%,name.ilike.%${nameFilter}%`);
    }

    if (departmentFilter) {
      query = query.eq('department', departmentFilter);
    }
    if (givenByFilter) {
      query = query.eq('given_by', givenByFilter);
    }
    if (doerFilter) {
      query = query.eq('name', doerFilter);
    }
    if (freqFilter) {
      query = query.eq('frequency', freqFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Error when fetching data", error);
      return { data: [], total: 0 };
    }

    // Deduplicate: keep only first occurrence of each task_description + name combo
    const seen = new Set();
    const uniqueRows = (data || []).filter(row => {
      const key = `${(row.division || '').trim()}::${(row.department || '').trim()}::${(row.task_description || '').trim()}::${(row.name || '').trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const mapped = uniqueRows.map(row => ({
      ...row,
      id: row.task_id,
      given_by: parseJsonIfNeeded(row.given_by),
      name: parseJsonIfNeeded(row.name)
    }));

    // Paginate the deduplicated result
    const start = page * pageSize;
    const paginated = mapped.slice(start, start + pageSize);

    return {
      data: paginated,
      total: mapped.length
    };

  } catch (error) {
    console.log("Error from Supabase delegation", error);
    return { data: [], total: 0 };
  }
};

// Fetch unique EA tasks
export const fetchEAData = async (page = 0, pageSize = 50, nameFilter = '', dateFilter = 'all', givenByFilter = '', doerFilter = '') => {
  try {
    const FETCH_LIMIT = 10000;
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const username = localStorage.getItem("user-name");

    let query = supabase
      .from('ea_tasks')
      .select('*')
      .in('status', ['pending', 'extend', 'extended', 'Pending'])
      .order('planned_date', { ascending: true })
      .limit(FETCH_LIMIT);

    if (role === 'hod' && username) {
      const { data: reports } = await supabase
        .from("users")
        .select("user_name")
        .eq("reported_by", username);
      const reportingUsers = [username, ...(reports?.map(r => r.user_name) || [])];
      query = query.in('doer_name', reportingUsers);
    } else if (role === 'user' && username) {
      query = query.eq('doer_name', username);
    }

    if (nameFilter) {
      query = query.or(`task_description.ilike.%${nameFilter}%,doer_name.ilike.%${nameFilter}%`);
    }

    if (givenByFilter) {
      query = query.eq('given_by', givenByFilter);
    }
    if (doerFilter) {
      query = query.eq('doer_name', doerFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Error when fetching EA data", error);
      return { data: [], total: 0 };
    }

    // Deduplicate: keep only first occurrence of each task_description + doer_name + given_by + planned_date combo
    const seen = new Set();
    const uniqueRows = (data || []).filter(row => {
      const doer = (row.doer_name || row.name || '').trim();
      const given = (row.given_by || '').trim();
      const desc = (row.task_description || '').trim();
      const pDate = (row.planned_date || row.task_start_date || '').trim();
      const key = `${given}::${doer}::${desc}::${pDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const mapped = uniqueRows.map(row => ({
      ...row,
      id: row.task_id || row.id,
      name: parseJsonIfNeeded(row.doer_name || row.name),
      doer_name: parseJsonIfNeeded(row.doer_name || row.name),
      given_by: parseJsonIfNeeded(row.given_by),
      task_start_date: row.task_start_date || row.planned_date,
      planned_date: row.planned_date || row.task_start_date,
      department: "EA",
      frequency: "one-time",
      require_attachment: row.attachment ? "yes" : (row.require_attachment || "no")
    }));

    // Paginate the deduplicated result
    const start = page * pageSize;
    const paginated = mapped.slice(start, start + pageSize);

    return {
      data: paginated,
      total: mapped.length
    };
  } catch (error) {
    console.log("Error from Supabase ea_tasks", error);
    return { data: [], total: 0 };
  }
};

export const deleteChecklistTasksApi = async (tasks) => {
  for (const task of tasks) {
    const { error } = await supabase
      .from("checklist")
      .delete()
      .eq("department", task.department)
      .eq("name", task.name)
      .eq("task_description", task.task_description)
      .eq("frequency", task.frequency)
      .eq("given_by", task.given_by)
      .is("submission_date", null);

    if (error) throw error;
  }
  return tasks;
};

export const deleteDelegationTasksApi = async (tasks) => {
  for (const task of tasks) {
    const { error } = await supabase
      .from("delegation")
      .delete()
      .eq("department", task.department)
      .eq("name", task.name)
      .eq("task_description", task.task_description)
      .eq("frequency", task.frequency)
      .eq("given_by", task.given_by)
      .is("submission_date", null);

    if (error) throw error;
  }
  return tasks;
};

export const updateChecklistTaskApi = async (updatedTask, originalTask) => {
  try {
    let query = supabase.from("checklist").update({
      department: updatedTask.department,
      division: updatedTask.division || null,
      given_by: updatedTask.given_by,
      name: updatedTask.name,
      task_description: updatedTask.task_description,
      audio_url: updatedTask.audio_url,
      frequency: updatedTask.frequency,
      duration: updatedTask.duration || null,
      require_attachment: updatedTask.require_attachment,
      instruction_attachment_url: updatedTask.instruction_attachment_url,
      instruction_attachment_type: updatedTask.instruction_attachment_type,
      remark: updatedTask.remark,
      admin_done: false,
      reminder_days_before: updatedTask.reminder_days_before
    });

    if (originalTask) {
      // Update all matching pending tasks
      query = query
        .eq("department", originalTask.department)
        .eq("name", originalTask.name)
        .eq("task_description", originalTask.task_description)
        .is("submission_date", null);
    } else {
      // Fallback to single record update
      query = query.eq("task_id", updatedTask.id || updatedTask.task_id);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("API Error updating checklist task:", error);
    throw error;
  }
};

export const updateDelegationTaskApi = async (updatedTask, originalTask) => {
  try {
    let query = supabase.from("delegation").update({
      department: updatedTask.department,
      division: updatedTask.division || null,
      given_by: updatedTask.given_by,
      name: updatedTask.name,
      task_description: updatedTask.task_description,
      audio_url: updatedTask.audio_url,
      frequency: updatedTask.frequency,
      duration: updatedTask.duration || null,
      enable_reminder: updatedTask.enable_reminder || null,
      require_attachment: updatedTask.require_attachment,
      instruction_attachment_url: updatedTask.instruction_attachment_url,
      instruction_attachment_type: updatedTask.instruction_attachment_type,
      remarks: updatedTask.remarks
    });

    if (originalTask) {
      // Update all matching pending tasks
      query = query
        .eq("department", originalTask.department)
        .eq("name", originalTask.name)
        .eq("task_description", originalTask.task_description)
        .is("submission_date", null);
    } else {
      // Fallback to single record update
      query = query.eq("task_id", updatedTask.id || updatedTask.task_id);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("API Error updating delegation task:", error);
    throw error;
  }
};

export const deleteEATasksApi = async (tasks) => {
  for (const task of tasks) {
    const taskId = task.task_id || task.id;
    if (taskId) {
      const { error } = await supabase
        .from("ea_tasks")
        .delete()
        .eq("task_id", taskId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("ea_tasks")
        .delete()
        .eq("doer_name", task.doer_name || task.name)
        .eq("task_description", task.task_description)
        .eq("given_by", task.given_by);

      if (error) throw error;
    }
  }
  return tasks;
};

export const updateEATaskApi = async (updatedTaskOrObj, originalTaskParam) => {
  try {
    const updatedTask = updatedTaskOrObj?.updatedTask || updatedTaskOrObj || {};
    const originalTask = updatedTaskOrObj?.originalTask || originalTaskParam;

    const updatePayload = {
      given_by: updatedTask.given_by,
      name: updatedTask.name || updatedTask.doer_name,
      doer_name: updatedTask.doer_name || updatedTask.name,
      task_description: updatedTask.task_description,
      audio_url: updatedTask.audio_url,
      duration: updatedTask.duration || null,
      attachment: updatedTask.require_attachment === "yes" || updatedTask.attachment === true || updatedTask.attachment === "yes",
      remarks: updatedTask.remarks || updatedTask.remark,
      phone_number: updatedTask.phone_number || null,
      updated_at: new Date(new Date().getTime() + (330 * 60000)).toISOString().replace('Z', '+05:30')
    };

    let query = supabase.from("ea_tasks").update(updatePayload);

    if (updatedTask.id || updatedTask.task_id) {
      query = query.eq("task_id", updatedTask.id || updatedTask.task_id);
    } else if (originalTask) {
      query = query
        .eq("doer_name", originalTask.doer_name || originalTask.name)
        .eq("task_description", originalTask.task_description);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("API Error updating EA task:", error);
    throw error;
  }
};

// Add this new function
export const fetchUsersData = async () => {
  try {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const username = localStorage.getItem("user-name");

    let query = supabase
      .from('users')
      .select('user_name, reported_by')
      .not('user_name', 'is', null);

    if (role === 'hod' && username) {
      query = query.or(`reported_by.eq.${username},user_name.eq.${username}`);
    }

    const { data, error } = await query;

    if (error) {
      console.log("Error when fetching users", error);
      return [];
    }

    console.log("Fetched users successfully", data);
    return data;

  } catch (error) {
    console.log("Error from Supabase", error);
    return [];
  }
};

export const fetchPendingChecklistApprovals = async () => {
  try {
    const { data, error } = await supabase
      .from('checklist')
      .select('*')
      .not('submission_date', 'is', null) // Has been submitted
      .or('admin_done.is.null,admin_done.eq.false') // Not yet admin approved
      .order('submission_date', { ascending: false });

    if (error) {
      console.error("Supabase Error fetching pending checklist approvals:", error);
      throw error;
    }
    return (data || []).map(row => ({ ...row, id: row.task_id }));
  } catch (error) {
    console.error("Error fetching pending checklist approvals:", error);
    return [];
  }
};

export const approveChecklistTask = async (id) => {
  try {
    const username = localStorage.getItem("user-name") || "Admin";
    const now = new Date(new Date().getTime() + (330 * 60000)).toISOString().replace('Z', '+05:30');
    const { data, error } = await supabase
      .from('checklist')
      .update({
        admin_done: true,
        admin_approval_date: now,
        admin_approved_by: username
      })
      .eq('task_id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error approving checklist task:", error);
    throw error;
  }
};

export const rejectChecklistTask = async (id, reason) => {
  try {
    const { data, error } = await supabase
      .from('checklist')
      .update({
        admin_done: false,
        submission_date: null,
        remark: reason,
      })
      .eq('task_id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error rejecting checklist task:", error);
    throw error;
  }
};

export const fetchChecklistHistory = async () => {
  try {
    const { data, error } = await supabase
      .from('checklist')
      .select('*')
      .eq('admin_done', true)
      .order('submission_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({ ...row, id: row.task_id }));
  } catch (error) {
    console.error("Error fetching checklist history:", error);
    return [];
  }
};
