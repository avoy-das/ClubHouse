import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import eventService from '../../services/eventService';
import clubService from '../../services/clubService';
import EventModal from '../../components/Events/EventModal';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/imageUrl';

const statusBadgeStyles = {
    upcoming: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    ongoing: 'bg-amber-100 text-amber-800 border-amber-200',
    completed: 'bg-slate-100 text-slate-700 border-slate-200',
    published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    draft: 'bg-purple-100 text-purple-700 border-purple-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};

const EventsPage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const preselectedClubId = searchParams.get('create_club_id') || searchParams.get('club_id') || '';
    const [events, setEvents] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Filter states
    const [search, setSearch] = useState('');
    const [clubId, setClubId] = useState('');
    const [datePreset, setDatePreset] = useState('upcoming');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const navigate = useNavigate();

    // Fetch clubs for dropdown
    useEffect(() => {
        clubService.getClubs()
            .then(res => setClubs(res.data || []))
            .catch(() => setClubs([]));
    }, []);

    // Reset page to 1 on filter changes
    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleClubChange = (e) => {
        setClubId(e.target.value);
        setPage(1);
    };

    const handleDatePresetChange = (e) => {
        setDatePreset(e.target.value);
        setPage(1);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    // Fetch events whenever filters or page change
    const fetchEvents = () => {
        setLoading(true);
        setError(null);

        const params = {
            page,
            search: search.trim() || undefined,
            club_id: clubId || undefined,
            date_preset: datePreset || undefined,
            status: statusFilter || undefined,
        };

        eventService.getEvents(params)
            .then(res => {
                const data = res.data;
                if (data.data) {
                    setEvents(data.data);
                    setPagination({
                        current_page: data.current_page,
                        last_page: data.last_page,
                        total: data.total,
                    });
                } else {
                    setEvents(Array.isArray(data) ? data : []);
                }
            })
            .catch(() => setError('Failed to load events.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchEvents();
    }, [page, search, clubId, datePreset, statusFilter]);

    const handleEventCreated = (newEvent) => {
        setIsCreateOpen(false);
        fetchEvents();
        if (newEvent?.id) {
            navigate(`/events/${newEvent.id}`);
        }
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <MainLayout>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Events</h1>
                    <p className="text-slate-500 mt-1">
                        Browse all published events across clubs and manage your registrations.
                    </p>
                </div>
                {user && (
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
                    >
                        + Create Event
                    </button>
                )}
            </div>

            <EventModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={handleEventCreated}
                defaultClubId={preselectedClubId}
                isLockedClub={Boolean(preselectedClubId)}
            />

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                {/* Search */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Search Event</label>
                    <input
                        type="text"
                        placeholder="Search by event title..."
                        value={search}
                        onChange={handleSearchChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50"
                    />
                </div>

                {/* Club Filter */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Club</label>
                    <select
                        value={clubId}
                        onChange={handleClubChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50"
                    >
                        <option value="">All Clubs</option>
                        {clubs.map(club => (
                            <option key={club.id} value={club.id}>
                                {club.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date Preset */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                    <select
                        value={datePreset}
                        onChange={handleDatePresetChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50"
                    >
                        <option value="">All Dates</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="past">Past Events</option>
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                    <select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-slate-50"
                    >
                        <option value="">All Statuses</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* States */}
            {loading && (
                <div className="flex justify-center py-12">
                    <p className="text-slate-400 text-sm animate-pulse">Loading events...</p>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200 mb-6">
                    {error}
                </div>
            )}

            {/* Event Grid */}
            {!loading && !error && (
                <>
                    {events.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center my-6">
                            <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <h3 className="text-base font-semibold text-slate-700">No events match your filters</h3>
                            <p className="text-slate-400 text-sm mt-1">Try resetting or broadening your filter criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {events.map(event => {
                                const isFull = event.capacity !== null && event.registrations_count >= event.capacity;
                                const formattedStatus = event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Published';

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => navigate(`/events/${event.id}`)}
                                        className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
                                    >
                                        <div>
                                            {getImageUrl(event.banner_url || event.banner_path) && (
                                                <div className="h-36 -mx-5 -mt-5 mb-4 overflow-hidden bg-slate-100 border-b border-slate-200">
                                                    <img
                                                        src={getImageUrl(event.banner_url || event.banner_path)}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                                    {event.club?.name || 'Club Event'}
                                                </span>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadgeStyles[event.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                    {formattedStatus}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-slate-900 text-lg leading-snug mb-2 line-clamp-2">
                                                {event.title}
                                            </h3>

                                            <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>{formatDate(event.starts_at)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="truncate">
                                                        {event.location_type === 'online' ? 'Online' : (event.location_value || 'Physical Venue')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            {event.capacity !== null ? (
                                                isFull ? (
                                                    <span className="text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                        Fully Booked
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">
                                                        <strong className="text-slate-900">{event.registrations_count}</strong> / {event.capacity} spots taken
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-emerald-600 font-medium">Unlimited capacity</span>
                                            )}

                                            <span className="text-indigo-600 font-medium hover:underline flex items-center gap-1">
                                                Details &rarr;
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
                            <p className="text-xs text-slate-500">
                                Showing page <strong className="text-slate-900">{pagination.current_page}</strong> of <strong className="text-slate-900">{pagination.last_page}</strong> ({pagination.total} events)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={pagination.current_page === 1}
                                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                                    disabled={pagination.current_page === pagination.last_page}
                                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </MainLayout>
    );
};

export default EventsPage;
