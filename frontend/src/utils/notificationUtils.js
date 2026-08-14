/**
 * Helper to check if a notification is an announcement.
 *
 * @param {Object} notification
 * @returns {boolean}
 */
export const isAnnouncementNotification = (notification) => {
    if (!notification) return false;
    const type = notification.type || '';
    const relatedType = notification.related_type || '';
    return relatedType.includes('Announcement') || type.includes('announcement');
};

/**
 * Helper to determine the target route for a given notification.
 *
 * @param {Object} notification
 * @returns {string} Target URL path
 */
export const getNotificationTargetUrl = (notification) => {
    if (!notification) return '/notifications';

    const type = notification.type || '';
    const relatedType = notification.related_type || '';
    const relatedId = notification.related_id;

    // 1. Platform Admin Club Creation & Edit Requests
    if (type === 'club_creation_request' || type === 'club_edit_request' || type.includes('edit_request')) {
        return '/admin/clubs';
    }

    // 2. Event related notifications (event created, updated, cancelled, registration, attendance)
    if (relatedType.includes('Event') || type.includes('event')) {
        return relatedId ? `/events/${relatedId}` : '/events';
    }

    // 3. Recruitment Notices & Applications
    if (relatedType.includes('RecruitmentNotice') || relatedType.includes('Recruitment') || type.includes('recruitment')) {
        if (type === 'recruitment_application_submitted') {
            return relatedId ? `/recruitment/${relatedId}/applications` : '/recruitment';
        }
        return relatedId ? `/recruitment/${relatedId}` : '/recruitment';
    }

    // 4. Announcements
    if (relatedType.includes('Announcement') || type.includes('announcement')) {
        return '/announcements';
    }

    // 5. Club & Membership related notifications (approved, rejected, updated, member joined/left/removed, role changed)
    if (relatedType.includes('Club') || type.includes('club') || type.includes('member') || type.includes('membership')) {
        return relatedId ? `/clubs/${relatedId}` : '/clubs';
    }

    // 6. Security Alerts & Password Changes
    if (type.includes('security') || type.includes('password') || type.includes('profile')) {
        return '/profile';
    }

    // Default Fallback
    return '/dashboard';
};
