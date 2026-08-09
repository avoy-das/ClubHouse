import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../../services/eventService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import { useAuth } from '../../context/AuthContext';
import EventForm from './EventForm';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { Calendar, MapPin, Clock, Plus, ArrowLeft, ArrowRight } from 'lucide-react';

const EventListContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();
    const { user } = useAuth();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const loadEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            let res;
            if (clubId) {
                res = await eventService.listForClub(clubId);
            } else {
                res = await eventService.listAll();
            }
            const list = res.data || res;
            setEvents(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [clubId]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-blue-600" /> Club Events
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Browse workshops, competitions, and club meetups.</p>
                </div>
                <div className="flex space-x-3">
                    {clubId && (
                        <Link to={`/clubs/${clubId}`}>
                            <button className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 text-[#0b1c30] text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5">
                                <ArrowLeft className="w-4 h-4" /> Back to Club
                            </button>
                        </Link>
                    )}
                    {clubId && can('can_manage_events') && !user?.is_admin && (
                        <button
                            onClick={() => setIsFormOpen(true)}
                            className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                            <Plus className="w-4 h-4" /> Create Event
                        </button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {loading ? (
                <LoadingSpinner />
            ) : events.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                    <p className="text-base font-medium">No events scheduled.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((evt) => (
                        <Card key={evt.id} className="flex flex-col justify-between hover:shadow-xs transition border border-slate-200 bg-white rounded-xl p-6">
                            <div>
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-lg text-[#0b1c30] leading-snug">{evt.title}</h3>
                                    {evt.status && <Badge status={evt.status} />}
                                </div>
                                <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 mb-3">
                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-blue-600" /> {evt.venue || 'TBA'}</span>
                                    <span>&bull;</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> {new Date(evt.start_at || evt.starts_at).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-3 mb-4">{evt.description}</p>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-medium">
                                    {evt.capacity ? `Cap: ${evt.capacity}` : 'Unlimited'}
                                </span>
                                <Link to={`/clubs/${evt.club_id || clubId}/events/${evt.id}`}>
                                    <button className="px-3 py-1.5 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-xs">
                                        View & Register <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {clubId && (
                <EventForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    clubId={clubId}
                    onSuccess={loadEvents}
                />
            )}
        </div>
    );
};

const EventList = () => {
    const { clubId } = useParams();
    if (clubId) {
        return (
            <ClubPermissionsProvider clubId={clubId}>
                <EventListContent />
            </ClubPermissionsProvider>
        );
    }
    return <EventListContent />;
};

export default EventList;
