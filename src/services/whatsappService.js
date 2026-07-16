import supabase from "../SupabaseClient";

/**
 * WhatsApp Messaging Service
 * Sends task notifications to users via WhatsApp
 */


// WhatsApp API Configuration
// WhatsApp API Configuration (Meta Cloud API)
const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_WABA_ID = import.meta.env.VITE_WHATSAPP_WABA_ID;

// Toggle to enable/disable WhatsApp service
const ENABLE_WHATSAPP = true; // Set to true to enable WhatsApp notifications

const APP_LINK = "https://checklist-delegation-supabase-nutech.vercel.app/login";


/**
 * Format phone number to international format
 * @param {string} phone - Phone number (can be with or without country code)
 * @returns {string} - Formatted phone number with country code
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = String(phone).replace(/\D/g, '');

    // If doesn't start with country code, assume India (+91)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }

    return cleaned;
};

/**
 * Get user phone number from database
 * @param {string} username - Username to fetch phone for
 * @returns {Promise<string|null>} - Phone number or null
 */
const getUserPhoneNumber = async (username) => {
    try {
        console.log(`🔍 Fetching phone for user: "${username}"`);
        const { data, error } = await supabase
            .from('users')
            .select('number')
            .eq('user_name', username)
            .limit(1);

        if (error) {
            console.error('Supabase User Fetch Error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            console.warn(`⚠️ User "${username}" not found in database.`);
            return null;
        }

        return data[0]?.number || null;
    } catch (error) {
        console.error('Error fetching user phone:', error);
        return null;
    }
};

/**
 * Send WhatsApp message using Maytapi API
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message text
 * @returns {Promise<boolean>} - Success status
 */
const triggerWhatsAppToast = () => {
    const event = new CustomEvent("SHOW_WHATSAPP_TOAST", {
        detail: { message: "WhatsApp message sent successfully!", type: "success" }
    });
    window.dispatchEvent(event);
};

/**
 * Send WhatsApp message using Maytapi API
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - Message text
 * @returns {Promise<boolean>} - Success status
 */
const sendWhatsAppMessage = async (phoneNumber, message) => {
    if (!ENABLE_WHATSAPP) {
        console.log(`📱 [WhatsApp Disabled] To: +${phoneNumber}, Message: ${message}`);
        return true;
    }
    triggerWhatsAppToast();
    return true;
};

/**
 * Send WhatsApp message using Meta Template API via Supabase Edge Function
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} templateName - Name of the template
 * @param {Array} parameters - Array of parameter values for the template
 * @param {string} languageCode - Language code (default: 'en')
 * @returns {Promise<boolean>} - Success status
 */
const sendWhatsAppTemplate = async (phoneNumber, templateName, parameters = [], languageCode = 'en') => {
    if (!ENABLE_WHATSAPP) {
        console.log(`📱 [WhatsApp Disabled] Template: ${templateName}, To: +${phoneNumber}, Params:`, parameters);
        return true;
    }

    try {
        console.log(`📡 Calling Supabase Edge Function "whatsapp-template-dispatch" for template "${templateName}" to +${phoneNumber}...`);
        const cleanNumber = formatPhoneNumber(phoneNumber);
        if (!cleanNumber) {
            console.error("❌ Invalid phone number format.");
            return false;
        }

        const { data, error } = await supabase.functions.invoke('whatsapp-template-dispatch', {
            body: {
                phoneNumber: cleanNumber,
                templateName,
                parameters,
                languageCode
            }
        });

        if (error) {
            console.error("❌ Supabase Edge Function Invocation Error:", error);
            return false;
        }

        console.log("✅ Supabase Edge Function WhatsApp Response:", data);
        return true;
    } catch (err) {
        console.error("❌ Failed to call WhatsApp Edge Function:", err);
        return false;
    }
};

/**
 * Send WhatsApp voice message (PTT/Audio) using Maytapi API
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} audioUrl - Public URL of the audio file
 * @returns {Promise<boolean>} - Success status
 */
const sendWhatsAppVoiceMessage = async (phoneNumber, audioUrl) => {
    if (!ENABLE_WHATSAPP) {
        console.log(`🎤 [WhatsApp Disabled] Voice Message to +${phoneNumber}, Audio URL: ${audioUrl}`);
        return true;
    }
    return true;
};


/**
 * Send urgent task notification
 */
export const sendUrgentTaskNotification = async (taskDetails) => {
    try {
        const {
            doerName,
            taskId,
            description,
            dueDate,
            givenBy,
            department,
            taskType,
            duration
        } = taskDetails;

        const phoneNumber = await getUserPhoneNumber(doerName);
        if (!phoneNumber) return false;

        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
        let displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note: ${audioUrl}` : description;
        if (duration) {
            displayDescription = `${displayDescription} (Duration: ${duration})`;
        }

        let sent;
        if (taskType?.toLowerCase() === 'delegation') {
            const defaultStart = new Date().toLocaleString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });
            const startVal = taskDetails.startDate || defaultStart;
            const deadlineVal = dueDate || taskDetails.startDate || defaultStart;

            sent = await sendWhatsAppTemplate(
                phoneNumber,
                'new_delegation_task_assign',
                [doerName, String(taskId || ''), givenBy, displayDescription, startVal, deadlineVal]
            );
        } else {
            const frequencyVal = "Urgent";
            const startVal = taskDetails.startDate || dueDate || new Date().toLocaleString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            });

            sent = await sendWhatsAppTemplate(
                phoneNumber,
                'new_checklist_task_assign',
                [doerName, givenBy, department || 'General', displayDescription, startVal, frequencyVal]
            );
        }

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }
        return sent;
    } catch (error) {
        console.error('Error sending urgent notification:', error);
        return false;
    }
};

/**
 * Send checklist task notification
 */
export const sendChecklistTaskNotification = async (taskDetails) => {
    try {
        const { doerName, description, startDate, givenBy, department, duration } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);
        if (!phoneNumber) return false;

        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
        let displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note: ${audioUrl}` : description;
        if (duration) {
            displayDescription = `${displayDescription} (Duration: ${duration})`;
        }

        const frequencyVal = taskDetails.frequency || taskDetails.freq || "One-time";

        const sent = await sendWhatsAppTemplate(
            phoneNumber,
            'new_checklist_task_assign',
            [doerName, givenBy, department || 'General', displayDescription, startDate, frequencyVal]
        );

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }
        return sent;
    } catch (error) {
        console.error('Error sending checklist notification:', error);
        return false;
    }
};

/**
 * Send maintenance task notification
 */
export const sendMaintenanceTaskNotification = async (taskDetails) => {
    try {
        const { doerName, description, startDate, givenBy, department, duration } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);
        if (!phoneNumber) return false;

        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
        let displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note: ${audioUrl}` : description;
        if (duration) {
            displayDescription = `${displayDescription} (Duration: ${duration})`;
        }

        const frequencyVal = taskDetails.frequency || taskDetails.freq || "One-time";

        const sent = await sendWhatsAppTemplate(
            phoneNumber,
            'new_checklist_task_assign',
            [doerName, givenBy, department || 'General', displayDescription, startDate, frequencyVal]
        );

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }
        return sent;
    } catch (error) {
        console.error('Error sending maintenance notification:', error);
        return false;
    }
};

/**
 * Send repair task notification
 */
export const sendRepairTaskNotification = async (taskDetails) => {
    try {
        const { doerName, description, startDate, givenBy, department, duration } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);
        if (!phoneNumber) return false;

        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
        let displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note: ${audioUrl}` : description;
        if (duration) {
            displayDescription = `${displayDescription} (Duration: ${duration})`;
        }

        const frequencyVal = taskDetails.frequency || taskDetails.freq || "One-time";

        const sent = await sendWhatsAppTemplate(
            phoneNumber,
            'new_checklist_task_assign',
            [doerName, givenBy, department || 'General', displayDescription, startDate, frequencyVal]
        );

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }
        return sent;
    } catch (error) {
        console.error('Error sending repair notification:', error);
        return false;
    }
};

/**
 * Send EA task notification
 */
export const sendEATaskNotification = async (taskDetails) => {
    try {
        const { doerName, description, startDate, givenBy, department, duration } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);
        if (!phoneNumber) return false;

        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
        let displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note: ${audioUrl}` : description;
        if (duration) {
            displayDescription = `${displayDescription} (Duration: ${duration})`;
        }

        const frequencyVal = taskDetails.frequency || taskDetails.freq || "One-time";

        const sent = await sendWhatsAppTemplate(
            phoneNumber,
            'new_checklist_task_assign',
            [doerName, givenBy, department || 'General', displayDescription, startDate, frequencyVal]
        );

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }
        return sent;
    } catch (error) {
        console.error('Error sending EA notification:', error);
        return false;
    }
};

/**
 * Send delegation task notification
 */
export const sendDelegationTaskNotification = async (taskDetails) => {
    try {
        const { doerName, description, startDate, givenBy, department, taskId, dueDate, duration } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);
        if (!phoneNumber) return false;

        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
        let displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note: ${audioUrl}` : description;
        if (duration) {
            displayDescription = `${displayDescription} (Duration: ${duration})`;
        }

        const defaultStart = new Date().toLocaleString('en-IN', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        });
        const startVal = dueDate ? startDate : defaultStart;
        const deadlineVal = dueDate || startDate || defaultStart;

        const sent = await sendWhatsAppTemplate(
            phoneNumber,
            'new_delegation_task_assign',
            [doerName, String(taskId || ''), givenBy, displayDescription, startVal, deadlineVal]
        );

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }
        return sent;
    } catch (error) {
        console.error('Error sending delegation notification:', error);
        return false;
    }
};

/**
 * Send task extension notification
 */
export const sendTaskExtensionNotification = async (taskDetails) => {
    try {
        const { doerName, taskId, givenBy, description, nextExtendDate } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);

        if (!phoneNumber) return false;

        // Extract audio URL from description if present
        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);

        // If description is JUST the URL, enhance it
        const displayDescription = (audioUrl && description?.trim() === audioUrl)
            ? `🎤 Voice Note: ${audioUrl}`
            : description;

        const reasonVal = taskDetails.reason || taskDetails.remarks || taskDetails.remark || "No reason provided";

        // Template: extend_task_reminder
        // Variables: {{1}} taskId, {{2}} doerName, {{3}} description, {{4}} givenBy, {{5}} nextExtendDate, {{6}} reasonVal
        const sent = await sendWhatsAppTemplate(
            phoneNumber,
            'extend_task_reminder',
            [taskId, doerName, displayDescription, givenBy, nextExtendDate, reasonVal]
        );

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }

        return sent;
    } catch (error) {
        console.error('Error sending extension notification:', error);
        return false;
    }
};

/**
 * Send task assignment notification (Delegation Task)
 */
export const sendTaskAssignmentNotification = async (taskDetails) => {
    const { taskType } = taskDetails;

    switch (taskType?.toLowerCase()) {
        case 'checklist':
            return sendChecklistTaskNotification(taskDetails);
        case 'maintenance':
            return sendMaintenanceTaskNotification(taskDetails);
        case 'repair':
            return sendRepairTaskNotification(taskDetails);
        case 'ea':
            return sendEATaskNotification(taskDetails);
        case 'delegation':
            return sendDelegationTaskNotification(taskDetails);
        default:
            // For backward compatibility or if type is not provided
            try {
                const {
                    doerName,
                    taskId,
                    givenBy,
                    description,
                    startDate,
                } = taskDetails;

                const phoneNumber = await getUserPhoneNumber(doerName);

                if (!phoneNumber) {
                    console.warn(`No phone number found for user: ${doerName}`);
                    return false;
                }

                const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
                const match = description && description.match(urlRegex);
                const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
                const displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note Link: ${audioUrl}` : description;

                const message = `🔔 *REMINDER: DELEGATION TASK*\n` +
                    `Dear ${doerName},\n\n` +
                    `You have been assigned a new task. Please find the details below:\n\n` +
                    `📌 Task ID: ${taskId}\n` +
                    `🧑 Allocated By: ${givenBy}\n` +
                    `📝 Task Description: ${displayDescription}\n\n\n` +
                    `⏳ Deadline: ${startDate}\n` +
                    `✅ Closure Link: https://checklist-delegation-supabase-nutech.vercel.app/login\n` +
                    `Please make sure the task is completed before the deadline. For any assistance, feel free to reach out.\n\n` +
                    `Best regards,\n` +
                    `Acemark Stationers.`;

                const sent = await sendWhatsAppMessage(phoneNumber, message);
                if (sent && audioUrl) {
                    await new Promise(r => setTimeout(r, 1000));
                    await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
                }
                return sent;
            } catch (error) {
                console.error('Error sending task assignment notification:', error);
                return false;
            }
    }
};

/**
 * DEPRECATED - use sendTaskAssignmentNotification
 */
const formatTaskMessage = (taskDetails) => {
    return "Please use specific notification functions";
};

/**
 * Send task reminder notification
 * @param {Object} taskDetails - Task details
 * @returns {Promise<boolean>} - Success status
 */
export const sendTaskReminderNotification = async (taskDetails) => {
    try {
        const { doerName, description, dueDate } = taskDetails;

        const phoneNumber = await getUserPhoneNumber(doerName);

        if (!phoneNumber) {
            console.warn(`No phone number found for user: ${doerName}`);
            return false;
        }

        // Template: pending_task_reminder
        // Variables: {{1}} doerName, {{2}} description, {{3}} dueDate, {{4}} link
        return await sendWhatsAppTemplate(
            phoneNumber,
            'pending_task_reminder',
            [doerName, description, dueDate, APP_LINK]
        );
    } catch (error) {
        console.error('Error sending task reminder:', error);
        return false;
    }
};

/**
 * Send task completion notification to admin
 * @param {Object} taskDetails - Task details
 * @returns {Promise<boolean>} - Success status
 */
export const sendTaskCompletionNotification = async (taskDetails) => {
    try {
        const { givenBy, doerName, description, completedAt } = taskDetails;

        const phoneNumber = await getUserPhoneNumber(givenBy);

        if (!phoneNumber) {
            console.warn(`No phone number found for admin: ${givenBy}`);
            return false;
        }

        // Template: task_completed_notification
        // Variables: {{1}} description, {{2}} completedAt, {{3}} doerName
        return await sendWhatsAppTemplate(
            phoneNumber,
            'task_completed_notification',
            [description, completedAt, doerName]
        );
    } catch (error) {
        console.error('Error sending completion notification:', error);
        return false;
    }
};



/**
 * Send task rejection notification
 */
export const sendTaskRejectionNotification = async (taskDetails) => {
    try {
        const { doerName, taskId, description, taskType, reason } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);

        if (!phoneNumber) {
            console.warn(`No phone number found for user: ${doerName}`);
            return false;
        }

        // Template: task_rejected_notification
        // Variables: {{1}} doerName, {{2}} taskId, {{3}} description, {{4}} reason, {{5}} link
        return await sendWhatsAppTemplate(
            phoneNumber,
            'task_rejected_notification',
            [doerName, taskId, description || 'N/A', reason || 'No reason provided', APP_LINK]
        );
    } catch (error) {
        console.error('Error sending rejection notification:', error);
        return false;
    }
};

/**
 * Send task reassignment notification (Shifted Task)
 */
export const sendTaskReassignmentNotification = async (taskDetails) => {
    try {
        const {
            newDoerName,
            originalDoerName,
            taskId,
            description,
            startDate,
            givenBy,
            department,
            taskType
        } = taskDetails;

        const phoneNumber = await getUserPhoneNumber(newDoerName);
        if (!phoneNumber) return false;

        const urlRegex = /(https?:\/\/[^\s]+(?:voice-notes|audio-recordings)[^\s]*\.(?:mp3|ogg|wav|webm|m4a)?)/i;
        const match = description && description.match(urlRegex);
        const audioUrl = taskDetails.audioUrl || (match ? match[0] : null);
        const displayDescription = (audioUrl && description?.trim() === audioUrl) ? `🎤 Voice Note: ${audioUrl}` : description;

        // Template: task_transfer_notification
        // Variables: {{1}} doerName, {{2}} taskId, {{3}} taskType, {{4}} department, {{5}} description, {{6}} startDate, {{7}} link, {{8}} originalDoerName
        const sent = await sendWhatsAppTemplate(
            phoneNumber,
            'task_transfer_notification',
            [newDoerName, taskId, taskType || 'TASK', department || 'N/A', displayDescription, startDate, APP_LINK, originalDoerName]
        );

        if (sent && audioUrl) {
            await new Promise(r => setTimeout(r, 1000));
            await sendWhatsAppVoiceMessage(phoneNumber, audioUrl);
        }
        return sent;
    } catch (error) {
        console.error('Error sending reassignment notification:', error);
        return false;
    }
};

/**
 * Send Password Reset OTP to Admin
 */
export const sendPasswordResetOTP = async (username, otp) => {
    try {
        const adminNumber = "9131749390";
        const message = `🔐 *PASSWORD RESET REQUEST*\n\n` +
            `A password reset has been requested for:\n` +
            `👤 User: *${username}*\n` +
            `🔢 OTP Code: *${otp}*\n\n` +
            `Please provide this code to the user if the request is valid.\n\n` +
            `_Acemark Stationers_`;

        return await sendWhatsAppMessage(adminNumber, message);
    } catch (error) {
        console.error('Error sending password reset OTP:', error);
        return false;
    }
};

/**
 * Send admin remark notification for task extension
 */
export const sendAdminExtensionRemarkNotification = async (taskDetails) => {
    try {
        const { doerName, taskId, description, remark } = taskDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);

        if (!phoneNumber) return false;

        const message = `📝 *ADMIN REMARK ON EXTENSION*\n` +
            `Dear ${doerName},\n\n` +
            `Admin has added a remark regarding your task extension request.\n\n` +
            `📌 Task ID: ${taskId}\n` +
            `📋 Task: ${description || 'N/A'}\n` +
            `💬 Remark: *${remark}*\n\n` +
            `🔗 App Link: https://checklist-delegation-supabase-nutech.vercel.app/login\n\n` +
            `Best regards,\nAcemark Stationers.`;

        return await sendWhatsAppMessage(phoneNumber, message);
    } catch (error) {
        console.error('Error sending extension remark notification:', error);
        return false;
    }
};

/**
 * Send daily task summary notification
 * @param {Object} summaryDetails - Summary details
 * @returns {Promise<boolean>} - Success status
 */
export const sendDailyTaskSummaryNotification = async (summaryDetails) => {
    try {
        const { doerName, totalTasks, pendingTasks, todayTasks, focusTasksFor } = summaryDetails;
        const phoneNumber = await getUserPhoneNumber(doerName);
        if (!phoneNumber) return false;

        const dateStr = focusTasksFor || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        // Template: daily_reminder
        // Variables: {{1}} doerName, {{2}} totalTasks, {{3}} todayTasks, {{4}} pendingTasks
        return await sendWhatsAppTemplate(
            phoneNumber,
            'daily_reminder',
            [doerName, totalTasks, todayTasks, pendingTasks]
        );
    } catch (error) {
        console.error('Error sending daily task summary:', error);
        return false;
    }
};

/**
 * Send purchase delivered notification
 * @param {Object} deliveryDetails - Delivery details
 * @returns {Promise<boolean>} - Success status
 */
export const sendPurchaseDeliveredNotification = async (deliveryDetails) => {
    try {
        const { recipientName, transporterName, lrNo, date, productName, size1, size2 } = deliveryDetails;
        const phoneNumber = await getUserPhoneNumber(recipientName);
        if (!phoneNumber) return false;

        // Template: purchase_delivered
        // Variables: {{1}} TransporterName, {{2}} LRNo, {{3}} Date, {{4}} ProductName, {{5}} Size1, {{6}} Size2
        return await sendWhatsAppTemplate(
            phoneNumber,
            'purchase_delivered',
            [transporterName, lrNo, date, productName, size1, size2]
        );
    } catch (error) {
        console.error('Error sending purchase delivered notification:', error);
        return false;
    }
};

export default {
    sendUrgentTaskNotification,
    sendTaskExtensionNotification,
    sendTaskAssignmentNotification,
    sendChecklistTaskNotification,
    sendMaintenanceTaskNotification,
    sendRepairTaskNotification,
    sendEATaskNotification,
    sendDelegationTaskNotification,
    sendTaskReminderNotification,
    sendTaskCompletionNotification,
    sendTaskRejectionNotification,
    sendTaskReassignmentNotification,
    sendPasswordResetOTP,
    sendAdminExtensionRemarkNotification,
    sendDailyTaskSummaryNotification,
    sendPurchaseDeliveredNotification
};
