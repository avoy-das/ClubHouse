import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import searchService from '../../services/searchService';
import { useAuth } from '../../context/AuthContext';
import { Search, Folder, Building2, Calendar, Megaphone, Users } from 'lucide-react';
import usePageTitle from '../../hooks/usePageTitle';

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    usePageTitle(query ? `Search: ${query}` : 'Search');
    const { isAdmin } = useAuth();

    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('clubs');

    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setResults(null);
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await searchService.search(query.trim());
                setResults(res.data);
                setActiveTab('clubs');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch search results.');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]);

    const clubs = results?.clubs || [];
    const events = results?.events || [];
    const recruitment = results?.recruitment || [];
    const members = results?.members || [];

    const hasAdminMembersTab = isAdmin() && Array.isArray(results?.members);
    const totalResults = clubs.length + events.length + recruitment.length + (hasAdminMembersTab ? members.length : 0);

    const isPastEvent = (eventDate) => {
        if (!eventDate) return false;
        return new Date(eventDate) < new Date();
    };

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Search Header */}
                <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-3">
                        <Search className="w-6 h-6 text-blue-600" /> Search Results
                    </h1>
                    {query && (
                        <p className="text-slate-500 text-sm mt-1">
                            Showing results for <span className="font-semibold text-slate-800">"{query}"</span>
                        </p>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-3">
                        <div className="w-8 h-8 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm">Searching ClubHouse...</p>
                    </div>
                ) : !results ? (
                    <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                        Enter a query with at least 2 characters to search across ClubHouse.
                    </div>
                ) : totalResults === 0 ? (
                    // Global empty state if ALL tabs come back empty
                    <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                            <Folder className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-[#0b1c30]">No results found for '{query}'</h3>
                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                            Try checking for typos or searching with different keywords like club name, event title, or department.
                        </p>
                    </div>
                ) : (
                    <div>
                        {/* Tab Navigation Bar */}
                        <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl shadow-xs">
                            <button
                                onClick={() => setActiveTab('clubs')}
                                className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                                    activeTab === 'clubs'
                                        ? 'border-[#2563eb] text-[#2563eb]'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Building2 className="w-4 h-4" /> Clubs
                                <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                        activeTab === 'clubs'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {clubs.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('events')}
                                className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                                    activeTab === 'events'
                                        ? 'border-[#2563eb] text-[#2563eb]'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Calendar className="w-4 h-4" /> Events
                                <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                        activeTab === 'events'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {events.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('recruitment')}
                                className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                                    activeTab === 'recruitment'
                                        ? 'border-[#2563eb] text-[#2563eb]'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Megaphone className="w-4 h-4" /> Recruitment
                                <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                        activeTab === 'recruitment'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {recruitment.length}
                                </span>
                            </button>

                            {/* Members tab renders ONLY for admin users */}
                            {hasAdminMembersTab && (
                                <button
                                    onClick={() => setActiveTab('members')}
                                    className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                                        activeTab === 'members'
                                            ? 'border-[#eab308] text-[#0b1c30]'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <Users className="w-4 h-4" /> Members
                                    <span
                                        className={`px-2 py-0.5 text-xs rounded-full ${
                                            activeTab === 'members'
                                                ? 'bg-[#ffdf9a]/40 text-[#5a4300]'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {members.length}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Tab Content Panels */}
                        <div className="bg-white p-6 rounded-b-xl shadow-xs border border-t-0 border-slate-200 min-h-[300px]">
                            {/* Clubs Tab */}
                            {activeTab === 'clubs' && (
                                <div>
                                    {clubs.length === 0 ? (
                                        <p className="text-slate-500 text-sm py-8 text-center">
                                            No clubs found for '{query}'
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {clubs.map((club) => (
                                                <Link
                                                    key={club.id}
                                                    to={`/clubs/${club.id}`}
                                                    className="p-5 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-xs transition-all block group bg-[#f8f9ff]/50"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <h3 className="font-bold text-[#0b1c30] group-hover:text-[#2563eb] transition-colors text-lg">
                                                            {club.name}
                                                        </h3>
                                                        {club.category && (
                                                            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium">
                                                                {club.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-600 text-sm mt-2 line-clamp-2">
                                                        {club.description || 'No description provided.'}
                                                    </p>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Events Tab */}
                            {activeTab === 'events' && (
                                <div>
                                    {events.length === 0 ? (
                                        <p className="text-slate-500 text-sm py-8 text-center">
                                            No events found for '{query}'
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {events.map((event) => (
                                                <Link
                                                    key={event.id}
                                                    to={`/events/${event.id}`}
                                                    className="p-5 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-xs transition-all block group bg-[#f8f9ff]/50"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="font-bold text-[#0b1c30] group-hover:text-[#2563eb] transition-colors text-lg">
                                                            {event.title}
                                                        </h3>
                                                        {isPastEvent(event.starts_at || event.start_at) && (
                                                            <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 font-semibold rounded shrink-0">
                                                                Past
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                                                        {event.description || 'No description.'}
                                                    </p>

                                                    <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
                                                        <span>Hosted by: <strong className="text-slate-700">{event.club?.name || 'Club'}</strong></span>
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-blue-600" /> {new Date(event.starts_at || event.start_at).toLocaleDateString()}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recruitment Tab */}
                            {activeTab === 'recruitment' && (
                                <div>
                                    {recruitment.length === 0 ? (
                                        <p className="text-slate-500 text-sm py-8 text-center">
                                            No recruitment campaigns found for '{query}'
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {recruitment.map((notice) => (
                                                <Link
                                                    key={notice.id}
                                                    to={`/clubs/${notice.club_id}`}
                                                    className="p-5 border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-xs transition-all block group bg-[#f8f9ff]/50"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <h3 className="font-bold text-[#0b1c30] group-hover:text-[#2563eb] transition-colors text-lg">
                                                            {notice.title}
                                                        </h3>
                                                        <span
                                                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                                                                notice.status === 'open'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : notice.status === 'closed'
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                            }`}
                                                        >
                                                            {notice.status}
                                                        </span>
                                                    </div>

                                                    <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                                                        {notice.description || 'No details provided.'}
                                                    </p>

                                                    <div className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
                                                        Club: <strong className="text-slate-700">{notice.club?.name || 'Club'}</strong>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Members Tab (Admin only) */}
                            {hasAdminMembersTab && activeTab === 'members' && (
                                <div>
                                    {members.length === 0 ? (
                                        <p className="text-slate-500 text-sm py-8 text-center">
                                            No members found for '{query}'
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {members.map((member) => (
                                                <Link
                                                    key={member.id}
                                                    to={`/admin/users?user=${member.id}`}
                                                    className="p-5 border border-slate-200 rounded-xl bg-[#f8f9ff] hover:border-blue-500 hover:shadow-xs transition-all block group cursor-pointer"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-[#0f172a] text-white font-bold rounded-full flex items-center justify-center text-sm group-hover:bg-blue-600 transition-colors">
                                                                {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-[#0b1c30] group-hover:text-blue-600 transition-colors text-base">
                                                                    {member.name}
                                                                </h4>
                                                                <p className="text-slate-500 text-xs">{member.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1 text-slate-600 flex items-center justify-between">
                                                        <div>
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Student ID:</span> {member.student_id}
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-slate-700">Department:</span> {member.department || 'N/A'}
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            Inspect User →
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default SearchPage;
