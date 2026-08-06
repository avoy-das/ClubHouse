/**
 * Maps raw action keys to human-friendly action names.
 */
export const actionLabels = {
    'auth.register.success': 'User Account Registered',
    'auth.register.failed': 'Registration Attempt Failed',
    'auth.login.success': 'User Signed In',
    'auth.login.failed': 'Sign-In Attempt Failed',
    'auth.profile.updated': 'User Profile Updated',
    'auth.password.changed': 'Password Changed',
    'club.created': 'Club Request Created',
    'club.approved': 'Club Approved',
    'club.rejected': 'Club Request Rejected',
    'club.updated': 'Club Details Updated',
    'club.suspended': 'Club Suspended',
    'club.activated': 'Club Reactivated',
    'club.member_joined': 'Member Joined Club',
    'club.member_left': 'Member Left Club',
    'club.member_role_updated': 'Member Role Changed',
    'club.member_removed': 'Member Removed',
    'club.edit_requested': 'Club Edit Requested',
    'club.edit_approved': 'Club Edit Approved',
    'club.edit_rejected': 'Club Edit Rejected',
    'event.created': 'Event Created',
    'event.updated': 'Event Updated',
    'event.status_changed': 'Event Status Changed',
    'event.deleted': 'Event Deleted',
    'event.registered': 'Registered for Event',
    'event.registration_cancelled': 'Event Registration Cancelled',
    'event.attendance_updated': 'Attendance Status Updated',
    'recruitment.notice.created': 'Recruitment Campaign Created',
    'recruitment.notice.updated': 'Recruitment Campaign Updated',
    'recruitment.notice.deleted': 'Recruitment Campaign Deleted',
    'recruitment.application.submitted': 'Recruitment Application Submitted',
    'recruitment.application.interview': 'Application Advanced to Interview',
    'recruitment.application.accepted': 'Recruitment Application Accepted',
    'recruitment.application.rejected': 'Recruitment Application Rejected',
    'admin.user_updated': 'Admin Updated User Account',
    'admin.user_deactivated': 'Admin Deactivated User',
    'admin.club_deleted': 'Admin Deleted Club',
};

/**
 * Formats raw metadata objects into clean, human-readable plain English summary sentences.
 */
export function renderMetaSummary(log) {
    if (!log) return null;
    const meta = log.metadata || log.meta;
    if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) return null;

    const action = log.action || '';
    const summaries = [];

    // 1. Status transitions
    if (meta.previous_status && (meta.changed?.status || meta.status)) {
        const newStatus = meta.changed?.status || meta.status;
        summaries.push(`Status changed from "${meta.previous_status}" → "${newStatus}"`);
    } else if (meta.status && !meta.previous_status && !action.includes('recruitment')) {
        summaries.push(`Status set to "${meta.status}"`);
    }

    // 2. Explicit reason
    if (meta.reason) {
        summaries.push(`Reason: "${meta.reason}"`);
    }

    // 3. Member role updates
    if (meta.new_role || meta.role) {
        if (action.includes('member_role') || action.includes('role')) {
            summaries.push(`Role updated to "${meta.new_role || meta.role}"`);
        }
    }

    // 4. Observer attribute diffs (changed vs previous)
    if (meta.changed && meta.previous) {
        Object.keys(meta.changed).forEach((field) => {
            if (field === 'status') return; // Handled above
            const oldVal = meta.previous[field] !== undefined ? String(meta.previous[field]) : 'None';
            const newVal = meta.changed[field] !== undefined ? String(meta.changed[field]) : 'None';
            summaries.push(`${field.replace(/_/g, ' ')}: "${oldVal}" → "${newVal}"`);
        });
    }

    // 5. Updated fields list
    if (Array.isArray(meta.changed_fields) && meta.changed_fields.length > 0) {
        summaries.push(`Updated fields: ${meta.changed_fields.join(', ')}`);
    }

    // 6. Security/Authentication details
    if (meta.ip) {
        summaries.push(`IP: ${meta.ip}`);
    }

    // Return joined sentence if specific patterns matched
    if (summaries.length > 0) {
        return summaries.join(' · ');
    }

    // 7. Generic fallback for unhandled metadata properties (excluding duplicate label keys)
    const fallbackEntries = Object.entries(meta)
        .filter(([k]) => !['label', 'name', 'title', 'club_id', 'user_id', 'event_id'].includes(k))
        .map(([k, v]) => {
            if (k === 'request_id') {
                return `Edit Request #${v}`;
            }
            const formattedVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return `${k.replace(/_/g, ' ')}: ${formattedVal}`;
        });

    return fallbackEntries.length > 0 ? fallbackEntries.join(' · ') : null;
}
