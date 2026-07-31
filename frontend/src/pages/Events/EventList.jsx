import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../../services/eventService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import EventForm from './EventForm';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

const EventListContent = () => {
    const { clubId } = useParams();
    const { can } = useClubPermissions();

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Club Events</h1>
                    <p className="text-gray-500 text-sm">Browse workshops, competitions, and club meetups.</p>
                </div>
                <div className="flex space-x-3">
                    {clubId && (
                        <Link to={`/clubs/${clubId}`}>
                            <Button variant="secondary">← Back to Club</Button>
                        </Link>
                    )}
                    {clubId && can('can_manage_events') && (
                        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                            + Create Event
                        </Button>
                    )}
                </div>
            </div>

            {error && <ErrorBanner message={error} />}

            {loading ? (
                <LoadingSpinner />
            ) : events.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-lg shadow-sm border text-gray-500">
                    <p className="text-lg font-medium">No events scheduled.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((evt) => (
                        <Card key={evt.id} className="flex flex-col justify-between hover:shadow-md transition">
                            <div>
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-lg text-gray-900 leading-snug">{evt.title}</h3>
                                    {evt.status && <Badge status={evt.status} />}
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    📍 {evt.venue || 'TBA'} • 🕒 {new Date(evt.start_at).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600 line-clamp-3 mb-4">{evt.description}</p>
                            </div>
                            <div className="pt-3 border-t flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    {evt.capacity ? `Cap: ${evt.capacity}` : 'Unlimited'}
                                </span>
                                <Link to={`/clubs/${evt.club_id || clubId}/events/${evt.id}`}>
                                    <Button variant="primary" size="sm">
                                        View & Register →
                                    </Button>
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
