import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import eventService from '../../services/eventService';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    const [myEvents, setMyEvents] = useState([]);
    const [eventsLoading, setEventsLoading] = useState(true);

    useEffect(() => {
        eventService.getMyEvents('upcoming')
            .then(res => {
                const data = res.data;
                setMyEvents(data.data || (Array.isArray(data) ? data : []));
            })
            .catch(() => setMyEvents([]))
            .finally(() => setEventsLoading(false));
    }, []);

    const quickActions = [
        { label: 'Browse Events',     action: () => navigate('/events') },
        { label: 'Browse Clubs',      action: () => navigate('/clubs') },
        { label: 'Request a Club',    action: () => navigate('/clubs/create') },
        ...(isAdmin()
            ? [{ label: 'Admin Panel', action: () => navigate('/admin/clubs') }]
            : []),
    ];

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <MainLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">
                    Welcome back, {user?.name}
                </h1>
                <p className="text-slate-500 mt-1">
                    Here's what's happening on ClubHouse.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* My Clubs — placeholder until Week 5 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                        My Clubs
                    </h2>
                    <p className="text-sm text-slate-400">
                        Your club memberships will appear here once the memberships module is built.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((item) => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="flex items-center justify-center px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Announcements — placeholder until Week 6 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-base font-semibold text-slate-800 mb-4">
                        Recent Announcements
                    </h2>
                    <p className="text-sm text-slate-400">
                        Announcements from your clubs will appear here.
                    </p>
                </div>

                {/* Upcoming Events — Registered Events List */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-slate-800">
                            Upcoming Events
                        </h2>
                        <Link to="/events" className="text-xs font-semibold text-indigo-600 hover:underline">
                            Browse All &rarr;
                        </Link>
                    </div>

                    {eventsLoading ? (
                        <p className="text-sm text-slate-400 animate-pulse">Loading registered events...</p>
                    ) : myEvents.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-sm text-slate-400 mb-3">
                                You are not registered for any upcoming events yet.
                            </p>
                            <button
                                onClick={() => navigate('/events')}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors"
                            >
                                Explore Events
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myEvents.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={() => navigate(`/events/${event.id}`)}
                                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between"
                                >
                                    <div className="pr-2 min-w-0">
                                        <h4 className="font-semibold text-slate-900 text-sm truncate">
                                            {event.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <span className="text-indigo-600 font-medium">{event.club?.name}</span>
                                            <span>&bull;</span>
                                            <span>{formatDate(event.starts_at)}</span>
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                                        Registered
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </MainLayout>
    );
};

export default Dashboard;
