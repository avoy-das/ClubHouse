import { useState, useEffect, useCallback, useRef } from 'react';
import eventService from '../../services/eventService';
import clubService from '../../services/clubService';
import { Users, ClipboardList, Search, Check, X, FileText, Paperclip, HelpCircle, AlertTriangle, Ban, UserX, ShieldAlert, UserMinus, Clock, BarChart2 } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';
import useDebounce from '../../hooks/useDebounce';

/**
 * Safely extract the display label from a custom field object.
 * The backend may store the field name as `label`, `name`, or both.
 */
const getFieldLabel = (field, index) => {
    if (!field || typeof field !== 'object') return `Question ${index + 1}`;
    return String(field.label || field.name || `Question ${index + 1}`);
};

/**
 * Safely parse custom_fields from the event object.
 * Handles: array, JSON string, null/undefined.
 */
const parseCustomFields = (fields) => {
    if (Array.isArray(fields)) return fields;
    if (typeof fields === 'string') {
        try {
            const parsed = JSON.parse(fields);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

/**
 * Safely parse the `answers` column from a registration record.
 * Handles all known storage formats and always returns safe-to-render string values.
 */
const parseAnswers = (rawAnswers) => {
    const empty = { textAnswers: {}, fileAnswers: {} };

    if (!rawAnswers) return empty;

    let obj = rawAnswers;
    if (typeof rawAnswers === 'string') {
        try {
            obj = JSON.parse(rawAnswers);
        } catch {
            // If it's a plain string that isn't valid JSON, treat it as a single response
            return { textAnswers: { Response: rawAnswers }, fileAnswers: {} };
        }
    }

    if (typeof obj !== 'object' || obj === null) return empty;

    const textAnswers = {};
    const fileAnswers = {};

    // Case 1: structured { custom_text: {...}, custom_files: {...} }
    if (obj.custom_text && typeof obj.custom_text === 'object') {
        Object.entries(obj.custom_text).forEach(([key, val]) => {
            // CRITICAL: Always stringify to prevent React "objects are not valid as React child" crash
            textAnswers[key] = val !== null && val !== undefined ? String(val) : '';
        });
    }
    if (obj.custom_files && typeof obj.custom_files === 'object') {
        Object.entries(obj.custom_files).forEach(([key, val]) => {
            if (val && typeof val === 'object') {
                fileAnswers[key] = val;
            }
        });
    }

    // Case 2: flat key-value map (legacy or direct format)
    if (!obj.custom_text && !obj.custom_files) {
        Object.entries(obj).forEach(([key, val]) => {
            if (val && typeof val === 'object' && (val.url || val.path || val.name)) {
                fileAnswers[key] = val;
            } else if (val !== null && val !== undefined) {
                textAnswers[key] = String(val);
            }
        });
    }

    return { textAnswers, fileAnswers };
};

/**
 * A single safe-to-render text value component.
 * Guards against any non-string value reaching JSX.
 */
const SafeText = ({ value }) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};


const ViewResponsesModal = ({ isOpen, onClose, event }) => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);
    const isFirstRender = useRef(true);
    const [updatingUserId, setUpdatingUserId] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('responses');
    const [renderError, setRenderError] = useState(null);

    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockedLoading, setBlockedLoading] = useState(false);
    const [clubMembers, setClubMembers] = useState([]);
    const [selectedMemberToBlock, setSelectedMemberToBlock] = useState('');
    const [blockReason, setBlockReason] = useState('');

    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState(null);

    const fetchReport = useCallback(async () => {
        if (!event?.id) return;
        setReportLoading(true);
        setReportError(null);
        try {
            const res = await eventService.getAttendanceReport(event.id);
            setReport(res?.data);
        } catch (err) {
            setReportError(err?.response?.data?.message || 'Failed to generate attendance report.');
        } finally {
            setReportLoading(false);
        }
    }, [event?.id]);

    const fetchRegistrations = useCallback(async (query = '') => {
        if (!event?.id) return;
        setLoading(true);
        setError(null);
        setRenderError(null);
        try {
            const res = await eventService.getEventRegistrations(event.id, { search: query });
            const data = res?.data;
            if (data && Array.isArray(data.registrations)) {
                setRegistrations(data.registrations);
            } else if (data && Array.isArray(data)) {
                setRegistrations(data);
            } else {
                setRegistrations([]);
            }
        } catch (err) {
            const message = err?.response?.data?.message
                || err?.message
                || 'Failed to load attendee responses.';
            setError(message);
            setRegistrations([]);
        } finally {
            setLoading(false);
        }
    }, [event?.id]);

    const fetchBlockedUsers = useCallback(async () => {
        if (!event?.id) return;
        setBlockedLoading(true);
        try {
            const res = await eventService.getEventBlocks(event.id);
            setBlockedUsers(res?.data?.blocks || []);
        } catch (err) {
            console.error('Failed to load blocked users', err);
        } finally {
            setBlockedLoading(false);
        }
    }, [event?.id]);

    const fetchClubMembers = useCallback(async () => {
        if (!event?.club_id) return;
        try {
            const res = await clubService.listMembers(event.club_id);
            setClubMembers(res?.data || []);
        } catch (err) {
            console.error('Failed to load club members', err);
        }
    }, [event?.club_id]);

    useEffect(() => {
        if (isOpen && event?.id) {
            setSearch('');
            setActiveTab('responses');
            setRenderError(null);
            isFirstRender.current = true;
            fetchRegistrations('');
            fetchBlockedUsers();
            fetchClubMembers();
            fetchReport();
        }
    }, [isOpen, event?.id, fetchRegistrations, fetchBlockedUsers, fetchClubMembers, fetchReport]);

    useEffect(() => {
        if (isOpen && activeTab === 'report') {
            fetchReport();
        }
    }, [isOpen, activeTab, fetchReport]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (isOpen && event?.id) {
            fetchRegistrations(debouncedSearch);
        }
    }, [debouncedSearch]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    const handleToggleAttendance = async (userId, attendedVal) => {
        if (!event?.id || !userId) return;
        setUpdatingUserId(userId);
        try {
            await eventService.markAttendance(event.id, userId, attendedVal);
            setRegistrations(prev =>
                prev.map(r => r.user_id === userId ? { ...r, attended: attendedVal } : r)
            );
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to update attendance status.';
            setError(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleExecCancel = async (userId) => {
        if (!event?.id || !userId) return;
        const reason = window.prompt("Enter cancellation reason (optional):");
        if (reason === null) return;
        setUpdatingUserId(userId);
        try {
            await eventService.cancelAttendee(event.id, userId, reason);
            await fetchRegistrations(search);
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to cancel registration.';
            setError(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleExecBlock = async (userId) => {
        if (!event?.id || !userId) return;
        const reason = window.prompt("Enter block reason (optional):");
        if (reason === null) return;
        setUpdatingUserId(userId);
        try {
            await eventService.blockUser(event.id, userId, reason);
            await fetchRegistrations(search);
            await fetchBlockedUsers();
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to block user.';
            setError(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleManualBlock = async (e) => {
        e.preventDefault();
        if (!selectedMemberToBlock) return;
        setBlockedLoading(true);
        try {
            await eventService.blockUser(event.id, selectedMemberToBlock, blockReason);
            setSelectedMemberToBlock('');
            setBlockReason('');
            await fetchRegistrations(search);
            await fetchBlockedUsers();
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to block user.';
            setError(message);
        } finally {
            setBlockedLoading(false);
        }
    };

    const handleUnblock = async (userId) => {
        if (!event?.id || !userId) return;
        if (!window.confirm("Are you sure you want to unblock this user?")) return;
        setBlockedLoading(true);
        try {
            await eventService.unblockUser(event.id, userId);
            await fetchBlockedUsers();
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to unblock user.';
            setError(message);
        } finally {
            setBlockedLoading(false);
        }
    };

    const handleApprove = async (userId) => {
        if (!event?.id || !userId) return;
        setUpdatingUserId(userId);
        try {
            await eventService.approveRegistration(event.id, userId);
            await fetchRegistrations(search);
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to approve registration.';
            setError(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    const handleReject = async (userId) => {
        if (!event?.id || !userId) return;
        const reason = window.prompt("Enter rejection reason (optional):");
        if (reason === null) return;
        setUpdatingUserId(userId);
        try {
            await eventService.rejectRegistration(event.id, userId, reason);
            await fetchRegistrations(search);
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to reject registration.';
            setError(message);
        } finally {
            setUpdatingUserId(null);
        }
    };

    // Early return: don't render anything if not open or no event
    if (!isOpen || !event) return null;

    // If a render error occurred, show a fallback UI inside the modal
    if (renderError) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0f172a]/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-center">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Something went wrong</h3>
                    <p className="text-xs text-slate-500 mb-4">
                        An error occurred while displaying the responses. This is usually caused by unexpected data in registration answers.
                    </p>
                    <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 mb-4 break-words">
                        {renderError}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // Parse custom fields safely
    let customFields = [];
    try {
        customFields = parseCustomFields(event.custom_fields);
    } catch (e) {
        customFields = [];
    }

    // Build the modal content with try/catch protection
    let responsesContent;
    try {
        responsesContent = renderResponsesTab(
            registrations,
            loading,
            search,
            updatingUserId,
            handleToggleAttendance,
            handleExecCancel,
            handleExecBlock
        );
    } catch (e) {
        setRenderError(e?.message || 'Unknown rendering error');
        return null;
    }

    let pendingContent;
    try {
        pendingContent = renderPendingTab(
            registrations.filter(r => r?.status === 'pending'),
            loading,
            updatingUserId,
            handleApprove,
            handleReject
        );
    } catch (e) {
        setRenderError(e?.message || 'Unknown rendering error in pending tab');
        return null;
    }

    let schemaContent;
    try {
        schemaContent = renderSchemaTab(customFields);
    } catch (e) {
        setRenderError(e?.message || 'Unknown rendering error in schema tab');
        return null;
    }

    let blockedContent;
    try {
        blockedContent = renderBlocksTab(
            blockedUsers,
            blockedLoading,
            clubMembers,
            selectedMemberToBlock,
            setSelectedMemberToBlock,
            blockReason,
            setBlockReason,
            handleManualBlock,
            handleUnblock
        );
    } catch (e) {
        setRenderError(e?.message || 'Unknown rendering error in blocks tab');
        return null;
    }

    let reportContent;
    try {
        const m = report?.metrics || {
            total_registered: registrations.length || 0,
            attended_count: registrations.filter(r => r?.attendance_status === 'present').length || 0,
            absent_count: registrations.filter(r => r?.attendance_status === 'absent').length || 0,
            unmarked_count: registrations.filter(r => !r?.attendance_status || r?.attendance_status === 'unmarked').length || 0,
            attendance_rate: registrations.length > 0 ? Math.round((registrations.filter(r => r?.attendance_status === 'present').length / registrations.length) * 100) : 0,
            capacity: event.capacity,
            spots_remaining: event.capacity ? event.capacity - (event.registrations_count || 0) : null,
        };

        if (reportLoading) {
            reportContent = (
                <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                    Calculating attendance metrics...
                </div>
            );
        } else if (reportError) {
            reportContent = (
                <div className="my-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                    {reportError}
                </div>
            );
        } else {
            reportContent = (
                <div className="p-2 space-y-6">
                    {/* Attendance Rate Highlight Card */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-xs text-center">
                        <span className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                            Attendance Check-in Rate
                        </span>
                        <div className="text-4xl font-extrabold my-2 text-slate-900">
                            {m.attendance_rate}%
                        </div>
                        <p className="text-xs text-slate-600">
                            {m.attended_count} of {m.total_registered} registered attendees checked in
                        </p>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4 overflow-hidden border border-slate-300/60">
                            <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, m.attendance_rate)}%` }}
                            />
                        </div>
                    </div>

                    {/* Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                            <span className="text-xs font-semibold text-emerald-700 block">Attended (Present)</span>
                            <span className="text-2xl font-bold text-emerald-900 mt-1 block">{m.attended_count}</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                            <span className="text-xs font-semibold text-rose-700 block">Absent</span>
                            <span className="text-2xl font-bold text-rose-900 mt-1 block">{m.absent_count}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <span className="text-xs font-semibold text-slate-600 block">Unmarked</span>
                            <span className="text-2xl font-bold text-slate-800 mt-1 block">{m.unmarked_count}</span>
                        </div>
                    </div>

                    {/* Capacity & Registration Stats */}
                    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-2.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                            <span>Total Registered Attendees:</span>
                            <strong className="text-slate-900">{m.total_registered}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                            <span>Maximum Event Capacity:</span>
                            <strong className="text-slate-900">{m.capacity ?? 'Unlimited'}</strong>
                        </div>
                        {m.capacity !== null && (
                            <div className="flex justify-between text-slate-600">
                                <span>Available Remaining Spots:</span>
                                <strong className="text-slate-900">{m.spots_remaining}</strong>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    } catch (e) {
        setRenderError(e?.message || 'Unknown rendering error in report tab');
        return null;
    }

    const pendingCount = registrations.filter(r => r?.status === 'pending').length;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0f172a]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[11px] rounded-full uppercase tracking-wider border border-indigo-200/60">
                                Executive Suite
                            </span>
                            {event.requires_approval && (
                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-bold text-[11px] rounded-full uppercase tracking-wider border border-amber-200/60">
                                    Moderated Mode
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold text-[#0b1c30] flex items-center gap-2 mt-1">
                            <Users className="w-5 h-5 text-indigo-600" />
                            Attendance Control Center
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {event.title || 'Event'} &bull; {registrations.filter(r => r?.status !== 'pending' && r?.status !== 'rejected').length} confirmed member(s)
                            {pendingCount > 0 && ` &bull; ${pendingCount} pending review`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 self-start sm:self-auto"
                        title="Close"
                    >
                        &times;
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-4 border-b border-slate-200 shrink-0 pt-3 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('responses')}
                        className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'responses'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Users className="w-4 h-4" /> Attendee Roster ({registrations.filter(r => r?.status !== 'pending' && r?.status !== 'rejected').length})
                    </button>
                    {(pendingCount > 0 || event.requires_approval) && (
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'pending'
                                    ? 'border-amber-600 text-amber-600'
                                    : 'border-transparent text-amber-700 hover:text-amber-900'
                            }`}
                        >
                            <Clock className="w-4 h-4 text-amber-600" /> Pending Approvals ({pendingCount})
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'report'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <BarChart2 className="w-4 h-4" /> Attendance Analytics
                    </button>
                    {customFields.length > 0 && (
                        <button
                            onClick={() => setActiveTab('schema')}
                            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'schema'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <HelpCircle className="w-4 h-4" /> Form Questions ({customFields.length})
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('blocks')}
                        className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'blocks'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Ban className="w-4 h-4" /> Blocked Users ({blockedUsers.length})
                    </button>
                </div>

                {/* Search Bar (Responses tab only) */}
                {activeTab === 'responses' && (
                    <div className="py-3 border-b border-slate-100 shrink-0 relative">
                        <input
                            type="text"
                            placeholder="Search attendee by name, email, or student ID..."
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#2563eb] bg-[#f8f9ff]"
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5" />
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg shrink-0 flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-3">
                            &times;
                        </button>
                    </div>
                )}

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                    {activeTab === 'responses' && responsesContent}
                    {activeTab === 'pending' && pendingContent}
                    {activeTab === 'report' && reportContent}
                    {activeTab === 'schema' && schemaContent}
                    {activeTab === 'blocks' && blockedContent}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};


/**
 * Renders the Attendee Roster & Responses tab content.
 */
function renderResponsesTab(registrations, loading, search, updatingUserId, handleToggleAttendance, handleExecCancel, handleExecBlock) {
    if (loading) {
        return (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                Loading attendee roster & responses...
            </div>
        );
    }

    if (!Array.isArray(registrations) || registrations.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400 text-sm">
                {search ? `No attendees found matching "${search}".` : 'No members registered for this event yet.'}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {registrations.map((reg) => {
                if (!reg || typeof reg !== 'object') return null;

                const u = (reg.user && typeof reg.user === 'object') ? reg.user : {};
                const { textAnswers, fileAnswers } = parseAnswers(reg.answers);
                const hasAnswers = Object.keys(textAnswers).length > 0 || Object.keys(fileAnswers).length > 0;
                const isUpdating = updatingUserId === reg.user_id;

                return (
                    <div
                        key={reg.id || reg.user_id || Math.random()}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-colors"
                    >
                        {/* Attendee Info + Attendance Controls */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#0b1c30] text-sm">
                                        <SafeText value={u.name || 'Attendee'} />
                                    </span>
                                    {u.student_id && (
                                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                                            ID: <SafeText value={u.student_id} />
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3">
                                    {u.email && <span><SafeText value={u.email} /></span>}
                                    {u.department && <span>&bull; <SafeText value={u.department} /></span>}
                                    {reg.created_at && (
                                        <span className="text-slate-400">
                                            &bull; Reg: {formatDateSafe(reg.created_at)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Attendance / Waitlist Status & Controls */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {/* Registration status indicator */}
                                {reg.status === 'waitlisted' ? (
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Waitlisted
                                    </span>
                                ) : (
                                    <>
                                        {/* Status Badge */}
                                        {reg.attended === true && (
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Attended
                                            </span>
                                        )}
                                        {reg.attended === false && (
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-800 rounded-full border border-rose-200 flex items-center gap-1">
                                                <X className="w-3.5 h-3.5 text-rose-600" /> Absent
                                            </span>
                                        )}
                                        {(reg.attended === null || reg.attended === undefined) && (
                                            <span className="text-xs font-medium px-2.5 py-1 bg-slate-200 text-slate-600 rounded-full">
                                                Unmarked
                                            </span>
                                        )}

                                        {/* Check-in Buttons */}
                                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
                                            <button
                                                onClick={() => handleToggleAttendance(reg.user_id, true)}
                                                disabled={isUpdating || reg.attended === true}
                                                title="Mark as Attended"
                                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                    reg.attended === true
                                                        ? 'bg-emerald-600 text-white font-semibold'
                                                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                                } disabled:opacity-50`}
                                            >
                                                Present
                                            </button>
                                            <button
                                                onClick={() => handleToggleAttendance(reg.user_id, false)}
                                                disabled={isUpdating || reg.attended === false}
                                                title="Mark as Absent"
                                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                    reg.attended === false
                                                        ? 'bg-rose-600 text-white font-semibold'
                                                        : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                                                } disabled:opacity-50`}
                                            >
                                                Absent
                                            </button>
                                            {reg.attended !== null && reg.attended !== undefined && (
                                                <button
                                                    onClick={() => handleToggleAttendance(reg.user_id, null)}
                                                    disabled={isUpdating}
                                                    title="Reset status to unmarked"
                                                    className="px-2 py-1 text-slate-400 hover:text-slate-700 text-xs transition-colors"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Executive Actions: Cancel and Block */}
                                <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white ml-2">
                                    <button
                                        onClick={() => handleExecCancel(reg.user_id)}
                                        disabled={isUpdating}
                                        title="Cancel Registration (releases seat)"
                                        className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded transition-colors flex items-center gap-1"
                                    >
                                        <UserMinus className="w-3.5 h-3.5" /> Cancel Reg
                                    </button>
                                    <button
                                        onClick={() => handleExecBlock(reg.user_id)}
                                        disabled={isUpdating}
                                        title="Block user from registering"
                                        className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                                    >
                                        <Ban className="w-3.5 h-3.5 text-slate-500" /> Block
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Custom Answers Grid */}
                        {hasAnswers && (
                            <div className="pt-1">
                                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Submitted Answers:
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {/* Text Answers */}
                                    {Object.entries(textAnswers).map(([label, value]) => (
                                        <div key={label} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-0.5">
                                            <span className="block font-bold text-slate-700">
                                                <SafeText value={label} />
                                            </span>
                                            <p className="text-slate-800 whitespace-pre-wrap">
                                                <SafeText value={value} />
                                            </p>
                                        </div>
                                    ))}

                                    {/* File Answers */}
                                    {Object.entries(fileAnswers).map(([label, fileObj]) => {
                                        const fileUrl = fileObj?.url || fileObj?.path;
                                        const fileName = fileObj?.name || 'View Uploaded File';
                                        return (
                                            <div key={label} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                                                <span className="block font-bold text-slate-700">
                                                    <SafeText value={label} />
                                                </span>
                                                {fileUrl ? (
                                                    <a
                                                        href={getImageUrl(fileUrl)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded border border-blue-200 transition-colors text-[11px]"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                        <SafeText value={fileName} />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">File not available</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}


/**
 * Renders the Form Questions Schema tab content.
 */
function renderSchemaTab(customFields) {
    if (!Array.isArray(customFields) || customFields.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400 text-sm">
                No custom fields configured for this event.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <strong>Event Registration Questions Schema:</strong> Below are the custom questions configured by the event creator for attendees.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customFields.map((field, idx) => {
                    if (!field || typeof field !== 'object') return null;

                    const label = getFieldLabel(field, idx);
                    const fieldType = String(field.type || 'text');
                    const isRequired = Boolean(field.required);

                    // Parse options safely
                    let options = [];
                    if (fieldType === 'select') {
                        if (Array.isArray(field.options)) {
                            options = field.options.map(o => typeof o === 'string' ? o.trim() : String(o));
                        } else if (typeof field.options === 'string') {
                            options = field.options.split(',').map(o => o.trim()).filter(Boolean);
                        }
                    }

                    return (
                        <div key={field.id || idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-800 text-sm">
                                    #{idx + 1}. <SafeText value={label} />
                                </span>
                                {isRequired ? (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold text-[10px]">
                                        Required
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded font-medium text-[10px]">
                                        Optional
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-slate-600 pt-1">
                                <span className="font-semibold text-slate-700">Type:</span>
                                <span className="capitalize bg-white px-2 py-0.5 border border-slate-200 rounded text-[11px]">
                                    {fieldType}
                                </span>
                            </div>

                            {options.length > 0 && (
                                <div className="pt-1 space-y-1">
                                    <span className="font-semibold text-slate-700">Options:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {options.map((opt, oIdx) => (
                                            <span key={oIdx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700">
                                                <SafeText value={opt} />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


/**
 * Renders the Block List tab content.
 */
function renderBlocksTab(blockedUsers, loading, clubMembers, selectedMember, setSelectedMember, reason, setReason, onBlock, onUnblock) {
    if (loading) {
        return (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                Loading blocked users list...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Block Member Form */}
            <form onSubmit={onBlock} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Block a Club Member</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Member</label>
                        <select
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            required
                            className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:outline-none focus:border-blue-600"
                        >
                            <option value="">-- Choose Member --</option>
                            {clubMembers.map(m => {
                                const u = m.user || {};
                                return (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.student_id || u.email})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Block Reason</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Optional reason for blocking this student..."
                                className="flex-1 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-600"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shrink-0 flex items-center gap-1"
                            >
                                <Ban className="w-3.5 h-3.5" /> Block
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Blocked Users List */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Blocked Students ({blockedUsers.length})</h4>
                {blockedUsers.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                        No students are currently blocked from registering for this event.
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                        {blockedUsers.map((block) => {
                            const u = block.user || {};
                            return (
                                <div key={block.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800 text-xs">{u.name || 'Student'}</span>
                                            {u.student_id && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                                                    ID: {u.student_id}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            {u.email && <span>{u.email}</span>}
                                            {block.reason && <span className="ml-2 text-slate-700 bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-100">Reason: {block.reason}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onUnblock(block.user_id)}
                                        className="px-2.5 py-1 border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 bg-white shadow-sm"
                                    >
                                        <UserMinus className="w-3.5 h-3.5" /> Unblock
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}


/**
 * Safely format a date string for display.
 */
function formatDateSafe(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString();
    } catch {
        return 'N/A';
    }
}


/**
 * Renders the Pending Approvals tab content.
 */
function renderPendingTab(pendingRegs, loading, updatingUserId, handleApprove, handleReject) {
    if (loading) {
        return (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                Loading pending requests...
            </div>
        );
    }

    if (!Array.isArray(pendingRegs) || pendingRegs.length === 0) {
        return (
            <div className="py-12 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                No pending registration requests awaiting executive review.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {pendingRegs.map((reg) => {
                if (!reg || typeof reg !== 'object') return null;

                const u = (reg.user && typeof reg.user === 'object') ? reg.user : {};
                const { textAnswers, fileAnswers } = parseAnswers(reg.answers);
                const hasAnswers = Object.keys(textAnswers).length > 0 || Object.keys(fileAnswers).length > 0;
                const isUpdating = updatingUserId === reg.user_id;

                return (
                    <div
                        key={reg.id || reg.user_id}
                        className="p-4 bg-amber-50/40 border border-amber-200/80 rounded-xl space-y-3"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#0b1c30] text-sm">
                                        <SafeText value={u.name || 'Applicant'} />
                                    </span>
                                    {u.student_id && (
                                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold">
                                            ID: <SafeText value={u.student_id} />
                                        </span>
                                    )}
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Review
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3">
                                    {u.email && <span><SafeText value={u.email} /></span>}
                                    {u.department && <span>&bull; <SafeText value={u.department} /></span>}
                                    {reg.created_at && (
                                        <span className="text-slate-400">
                                            &bull; Applied: {formatDateSafe(reg.created_at)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Executive Approve / Reject Buttons */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleApprove(reg.user_id)}
                                    disabled={isUpdating}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" /> Approve
                                </button>
                                <button
                                    onClick={() => handleReject(reg.user_id)}
                                    disabled={isUpdating}
                                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                                >
                                    <X className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        </div>

                        {/* Custom Submitted Answers */}
                        {hasAnswers && (
                            <div className="pt-1">
                                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Submitted Application Answers:
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {Object.entries(textAnswers).map(([label, value]) => (
                                        <div key={label} className="bg-white p-2.5 rounded-lg border border-amber-200/80 text-xs space-y-0.5">
                                            <span className="block font-bold text-slate-700">
                                                <SafeText value={label} />
                                            </span>
                                            <p className="text-slate-800 whitespace-pre-wrap">
                                                <SafeText value={value} />
                                            </p>
                                        </div>
                                    ))}

                                    {Object.entries(fileAnswers).map(([label, fileObj]) => {
                                        const fileUrl = fileObj?.url || fileObj?.path;
                                        const fileName = fileObj?.name || 'View Uploaded File';
                                        return (
                                            <div key={label} className="bg-white p-2.5 rounded-lg border border-amber-200/80 text-xs space-y-1">
                                                <span className="block font-bold text-slate-700">
                                                    <SafeText value={label} />
                                                </span>
                                                {fileUrl ? (
                                                    <a
                                                        href={getImageUrl(fileUrl)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded border border-blue-200 transition-colors text-[11px]"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                        <SafeText value={fileName} />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">File not available</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}


export default ViewResponsesModal;
