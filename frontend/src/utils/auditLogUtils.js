/**
 * Maps raw action keys to human-friendly action names.
 */
export const actionLabels = {
    // Auth & Account
    'auth.register.success': 'User Account Registered',
    'auth.profile.updated': 'User Profile Updated',
    'auth.password.changed': 'Password Changed',
    'auth.logout_all': 'Logged Out All Sessions',

    // Admin & User Management
    'admin.user_updated': 'Admin Updated User Account',
    'admin.user_deactivated': 'Admin Deactivated User',
    'admin.role_promoted': 'Promoted to Administrator',
    'admin.role_demoted': 'Administrator Role Revoked',
    'admin.club_deleted': 'Admin Deleted Club',
    'admin.announcement_deleted': 'Admin Deleted Announcement',

    // Club Lifecycle & Governance
    'club.created': 'Club Request Created',
    'club.approved': 'Club Approved',
    'club.rejected': 'Club Request Rejected',
    'club.updated': 'Club Details Updated',
    'club.suspended': 'Club Suspended',
    'club.activated': 'Club Reactivated',
    'club.member_left': 'Member Left Club',
    'club.member_removed': 'Member Removed',
    'club.member_role_updated': 'Member Role Changed',
    'club.advisor_updated': 'Club Advisor Updated',
    'club.presidency_transferred': 'Presidency Transferred',
    'club.edit_requested': 'Club Edit Requested',
    'club.edit_approved': 'Club Edit Approved',
    'club.edit_rejected': 'Club Edit Rejected',
    'club.position_created': 'Club Position Created',
    'club.position_updated': 'Club Position Permissions Updated',
    'club.position_deleted': 'Club Position Deleted',
    'club.gallery_deleted': 'Gallery Image Deleted',

    // Membership Requests
    'membership.request_submitted': 'Membership Request Submitted',
    'membership.request_approved': 'Membership Request Approved',
    'membership.request_rejected': 'Membership Request Rejected',

    // Events
    'event.created': 'Event Created',
    'event.updated': 'Event Details Updated',
    'event.status_changed': 'Event Status Changed',
    'event.deleted': 'Event Deleted',
    'event.attendance_updated': 'Event Attendance Updated',

    // Announcements
    'announcement.pinned': 'Announcement Pinned',
    'announcement.deleted': 'Announcement Deleted',

    // Recruitment (2-level & 3-level fallback)
    'recruitment.notice_created': 'Recruitment Campaign Created',
    'recruitment.notice.created': 'Recruitment Campaign Created',
    'recruitment.notice_updated': 'Recruitment Campaign Updated',
    'recruitment.notice.updated': 'Recruitment Campaign Updated',
    'recruitment.notice_deleted': 'Recruitment Campaign Deleted',
    'recruitment.notice.deleted': 'Recruitment Campaign Deleted',
    'recruitment.application_submitted': 'Recruitment Application Submitted',
    'recruitment.application.submitted': 'Recruitment Application Submitted',
    'recruitment.application_accepted': 'Recruitment Application Accepted',
    'recruitment.application.accepted': 'Recruitment Application Accepted',
    'recruitment.application_rejected': 'Recruitment Application Rejected',
    'recruitment.application.rejected': 'Recruitment Application Rejected',
};

/**
 * Returns a styled role badge object { label, className } for actor roles.
 */
export function getRoleBadge(role) {
    const r = (role || '').toLowerCase();
    if (r === 'admin') {
        return { label: 'Admin', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    if (r === 'executive') {
        return { label: 'Executive', className: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
    return { label: 'Member', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

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
    if (meta.previous_role && meta.new_role) {
        summaries.push(`Role changed from "${meta.previous_role}" → "${meta.new_role}"`);
    } else if (meta.new_role || meta.role) {
        if (action.includes('member_role') || action.includes('role')) {
            summaries.push(`Role set to "${meta.new_role || meta.role}"`);
        }
    }

    // 4. Observer attribute diffs (changed vs previous)
    if (meta.changed && meta.previous) {
        Object.keys(meta.changed).forEach((field) => {
            if (field === 'status' || field === 'role') return; // Handled above
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
