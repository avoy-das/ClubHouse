import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../../services/eventService';
import { ClubPermissionsProvider } from '../../context/ClubPermissionsContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance Tracker</h1>
                    <p className="text-gray-500 text-sm">
                        Event: <span className="font-semibold text-gray-800">{eventData?.title}</span>
                    </p>
                </div>
                <Link to={`/clubs/${clubId || eventData?.club_id}/events/${eventId}`}>
                    <Button variant="secondary">← Back to Event</Button>
                </Link>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">Registered Attendees ({registrations.length})</h3>
                    <div className="text-xs text-gray-500">
                        Present:{' '}
                        <span className="font-bold text-green-700">
                            {registrations.filter((r) => r.attended).length}
                        </span>
                    </div>
                </div>

                {registrations.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">No users have registered for this event yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                                <tr>
                                    <th className="p-3">Attendee Name</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Registered At</th>
                                    <th className="p-3">Attendance Status</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {registrations.map((reg) => (
                                    <tr key={reg.id}>
                                        <td className="p-3 font-semibold text-gray-900">
                                            {reg.user?.name || `User #${reg.user_id}`}
                                        </td>
                                        <td className="p-3">{reg.user?.email || 'N/A'}</td>
                                        <td className="p-3">
                                            {reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="p-3">
                                            {reg.attended ? (
                                                <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded font-bold">
                                                    ✓ Attended
                                                </span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded">
                                                    Absent
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <Button
                                                variant={reg.attended ? 'danger' : 'primary'}
                                                size="sm"
                                                disabled={togglingId === reg.id}
                                                onClick={() => handleToggleAttendance(reg.id, reg.attended)}
                                            >
                                                {reg.attended ? 'Mark Absent' : 'Mark Present'}
                                            </Button>
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
