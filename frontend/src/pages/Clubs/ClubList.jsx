import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import clubService from '../../services/clubService';

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
                    <h1 className="text-2xl font-bold text-slate-900">Clubs</h1>
                    <p className="text-slate-500 mt-1">Browse all active clubs on ClubHouse.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Search clubs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* States */}
            {loading && (
                <p className="text-slate-400 text-sm">Loading clubs...</p>
            )}
            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}

            {/* Club Grid */}
            {!loading && !error && (
                <>
                    {filtered.length === 0 ? (
                        <p className="text-slate-400 text-sm">No clubs found.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filtered.map(club => (
                                <div
                                    key={club.id}
                                    onClick={() => navigate(`/clubs/${club.id}`)}
                                    className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-slate-900 text-base leading-tight">
                                            {club.name}
                                        </h3>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ml-2 shrink-0 ${categoryColors[club.category] || 'bg-slate-100 text-slate-700'}`}>
                                            {club.category}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm line-clamp-2 mb-3">
                                        {club.description}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {club.department}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Request a Club button */}
                    <div className="mt-10 pt-6 border-t border-slate-200 flex justify-center">
                        <button
                            onClick={() => navigate('/clubs/create')}
                            className="px-6 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            + Request a New Club
                        </button>
                    </div>
                </>
            )}
        </MainLayout>
    );
};

export default ClubList;
