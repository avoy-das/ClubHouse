import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../../services/eventService';
import { ClubPermissionsProvider } from '../../context/ClubPermissionsContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import { Check, ArrowLeft, ClipboardList } from 'lucide-react';

const EventAttendanceContent = () => {
    const { clubId, eventId } = useParams();

    const [eventData, setEventData] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const evtRes = await eventService.get(eventId);
            setEventData(evtRes.data || evtRes);

            const regRes = await eventService.listRegistrations(eventId);
            const list = regRes.data || regRes;
            setRegistrations(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load attendance list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) loadData();
    }, [eventId]);

    const handleToggleAttendance = async (regId, currentAttended) => {
        setTogglingId(regId);
        setError(null);
        setSuccess(null);
        try {
            await eventService.markAttendance(eventId, regId, !currentAttended);
            setSuccess(`Attendance updated.`);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update attendance');
        } finally {
            setTogglingId(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-blue-600" /> Attendance Tracker
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Event: <span className="font-semibold text-[#0b1c30]">{eventData?.title}</span>
                    </p>
                </div>
                <Link to={`/clubs/${clubId || eventData?.club_id}/events/${eventId}`}>
                    <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4" /> Back to Event
                    </button>
                </Link>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <h3 className="font-bold text-[#0b1c30] text-lg">Registered Attendees ({registrations.length})</h3>
                    <div className="text-xs text-slate-500 font-medium">
                        Present:{' '}
                        <span className="font-bold text-emerald-700">
                            {registrations.filter((r) => r.attended).length}
                        </span>
                    </div>
                </div>

                {registrations.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">No users have registered for this event yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold">
                                <tr>
                                    <th className="p-3.5">Attendee Name</th>
                                    <th className="p-3.5">Email</th>
                                    <th className="p-3.5">Registered At</th>
                                    <th className="p-3.5">Attendance Status</th>
                                    <th className="p-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {registrations.map((reg) => (
                                    <tr key={reg.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                        <td className="p-3.5 font-semibold text-[#0b1c30]">
                                            <div>{reg.user?.name || `User #${reg.user_id}`}</div>
                                            {reg.answers && (reg.answers.custom_text || reg.answers.custom_files) && (
                                                <div className="mt-1 text-[11px] font-normal text-slate-500 space-y-0.5">
                                                    {reg.answers.custom_text && Object.entries(reg.answers.custom_text).map(([k, v]) => (
                                                        <div key={k}><strong className="text-slate-700">{k}:</strong> {v}</div>
                                                    ))}
                                                    {reg.answers.custom_files && Object.entries(reg.answers.custom_files).map(([k, f]) => (
                                                        <div key={k}>
                                                            <strong className="text-slate-700">{k}:</strong>{' '}
                                                            <a href={f?.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                                                📎 {f?.name || 'View file'}
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3.5">{reg.user?.email || 'N/A'}</td>
                                        <td className="p-3.5">
                                            {reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="p-3.5">
                                            {reg.attended ? (
                                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-max">
                                                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Attended
                                                </span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium">
                                                    Absent
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <button
                                                disabled={togglingId === reg.id}
                                                onClick={() => handleToggleAttendance(reg.id, reg.attended)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                                                    reg.attended
                                                        ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                                        : 'bg-[#2563eb] text-white border-transparent hover:bg-[#0051d5]'
                                                } disabled:opacity-50`}
                                            >
                                                {reg.attended ? 'Mark Absent' : 'Mark Present'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const EventAttendance = () => {
    const { clubId } = useParams();
    return (
        <ClubPermissionsProvider clubId={clubId}>
            <EventAttendanceContent />
        </ClubPermissionsProvider>
    );
};

export default EventAttendance;
