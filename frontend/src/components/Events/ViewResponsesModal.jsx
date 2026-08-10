import { useState, useEffect, useCallback, useRef } from 'react';
import eventService from '../../services/eventService';
import { Users, ClipboardList, Search, Check, X, FileText, Paperclip, HelpCircle, AlertTriangle } from 'lucide-react';
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

    useEffect(() => {
        if (isOpen && event?.id) {
            setSearch('');
            setActiveTab('responses');
            setRenderError(null);
            isFirstRender.current = true;
            fetchRegistrations('');
        }
    }, [isOpen, event?.id, fetchRegistrations]);

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
            handleToggleAttendance
        );
    } catch (e) {
        setRenderError(e?.message || 'Unknown rendering error');
        return null;
    }

    let schemaContent;
    try {
        schemaContent = renderSchemaTab(customFields);
    } catch (e) {
        setRenderError(e?.message || 'Unknown rendering error in schema tab');
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0f172a]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-full uppercase tracking-wider border border-blue-200/60">
                                Executive View
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-[#0b1c30] flex items-center gap-2 mt-1">
                            <ClipboardList className="w-5 h-5 text-blue-600" />
                            Attendee Responses & Check-in
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {event.title || 'Event'} &bull; {registrations.length} registered member(s)
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
                <div className="flex items-center gap-4 border-b border-slate-200 shrink-0 pt-3">
                    <button
                        onClick={() => setActiveTab('responses')}
                        className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                            activeTab === 'responses'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Users className="w-4 h-4" /> Attendee Roster ({registrations.length})
                    </button>
                    {customFields.length > 0 && (
                        <button
                            onClick={() => setActiveTab('schema')}
                            className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                                activeTab === 'schema'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <HelpCircle className="w-4 h-4" /> Form Questions ({customFields.length})
                        </button>
                    )}
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
                    {activeTab === 'schema' && schemaContent}
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
function renderResponsesTab(registrations, loading, search, updatingUserId, handleToggleAttendance) {
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

                            {/* Attendance Controls */}
                            <div className="flex items-center gap-2 shrink-0">
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


export default ViewResponsesModal;
