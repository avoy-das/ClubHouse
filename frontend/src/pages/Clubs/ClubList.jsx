import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';
import { useAuth } from '../../context/AuthContext';
import { Building2, Users, Search, Plus, Shield, BarChart2 } from 'lucide-react';

const categoryColors = {
    'Academic':                    'bg-blue-100 text-blue-700',
    'Technology':                  'bg-violet-100 text-violet-700',
    'Cultural':                    'bg-pink-100 text-pink-700',
    'Sports':                      'bg-green-100 text-green-700',
    'Arts & Media':                'bg-orange-100 text-orange-700',
    'Business & Entrepreneurship': 'bg-yellow-100 text-yellow-700',
    'Community Service':           'bg-teal-100 text-teal-700',
    'Environment':                 'bg-emerald-100 text-emerald-700',
    'Health & Wellness':           'bg-rose-100 text-rose-700',
    'Recreation & Hobby':          'bg-cyan-100 text-cyan-700',
    'Other':                       'bg-slate-100 text-slate-700',
};

const ClubList = () => {
    const { isAdmin } = useAuth();
    const [clubs, setClubs]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState(null);
    const [search, setSearch]     = useState('');
    const [category, setCategory] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        clubService.getClubs()
            .then(res => setClubs(res.data))
            .catch(() => setError('Failed to load clubs.'))
            .finally(() => setLoading(false));
    }, []);

    const categories = [
        'Academic', 'Technology', 'Cultural', 'Sports',
        'Arts & Media', 'Business & Entrepreneurship',
        'Community Service', 'Environment', 'Health & Wellness',
        'Recreation & Hobby', 'Other',
    ];

    const filtered = clubs.filter(club => {
        const matchesSearch   = club.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = category ? club.category === category : true;
        return matchesSearch && matchesCategory;
    });

    return (
        <MainLayout>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-blue-600" /> Clubs
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Browse all active clubs on ClubHouse.</p>
                </div>

                {isAdmin() && (
                    <div className="flex space-x-2 text-xs font-semibold shrink-0">
                        <Link to="/admin/clubs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-amber-500" />
                            Club Approval
                        </Link>
                        <Link to="/admin/reports" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors flex items-center gap-1.5">
                            <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                            Reports & Stats
                        </Link>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search clubs..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] bg-white"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563eb] bg-white text-[#0b1c30]"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* States */}
            {loading && (
                <p className="text-slate-400 text-sm animate-pulse py-8 text-center">Loading clubs...</p>
            )}
            {error && (
                <p className="text-red-500 text-sm py-4">{error}</p>
            )}

            {/* Club Grid */}
            {!loading && !error && (
                <>
                    {filtered.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                            No clubs found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map(club => (
                                <div
                                    key={club.id}
                                    onClick={() => navigate(`/clubs/${club.id}`)}
                                    className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-[#0b1c30] text-base leading-tight">
                                                {club.name}
                                            </h3>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ml-2 shrink-0 ${categoryColors[club.category] || 'bg-slate-100 text-slate-700'}`}>
                                                {club.category}
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                                            {club.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 mt-2">
                                        <span>{club.department || 'General'}</span>
                                        <span className="font-medium text-slate-700 bg-[#f8f9ff] px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-blue-600" />
                                            {club.members_count ?? 0} members
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Request a Club button */}
                    <div className="mt-10 pt-6 border-t border-slate-200 flex justify-center">
                        <button
                            onClick={() => navigate('/clubs/create')}
                            className="px-6 py-3 bg-[#0f172a] hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2 shadow-xs"
                        >
                            <Plus className="w-4 h-4 text-[#eab308]" /> Request a New Club
                        </button>
                    </div>
                </>
            )}
        </MainLayout>
    );
};

export default ClubList;
