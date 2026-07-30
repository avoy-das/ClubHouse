import { useEffect, useState } from 'react';
import clubService from '../../services/clubService';
import ClubCard from '../../components/clubs/ClubCard';
import ClubForm from './ClubForm';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

const ClubList = () => {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const loadClubs = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {};
            if (search) params.search = search;
            if (category) params.category = category;
            const data = await clubService.list(params);
            const list = data.data || data;
            setClubs(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch clubs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClubs();
    }, [category]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        loadClubs();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Explore Clubs</h1>
                    <p className="text-gray-500 text-sm">Discover and join campus student organizations.</p>
                </div>
                <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                    + Request New Club
                </Button>
            </div>

            {/* Filter and Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg shadow-sm border">
                <input
                    type="text"
                    placeholder="Search clubs by name or keywords..."
                    className="flex-1 border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">All Categories</option>
                    <option value="academic">Academic & Tech</option>
                    <option value="cultural">Cultural & Arts</option>
                    <option value="sports">Sports & Gaming</option>
                    <option value="social">Social & Community</option>
                    <option value="other">Other</option>
                </select>
                <Button variant="secondary" type="submit">
                    Search
                </Button>
            </form>

            {error && <ErrorBanner message={error} />}

            {loading ? (
                <LoadingSpinner />
            ) : clubs.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-lg shadow-sm border text-gray-500">
                    <p className="text-lg font-medium">No clubs found.</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria or create a new club request.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clubs.map((club) => (
                        <ClubCard key={club.id} club={club} />
                    ))}
                </div>
            )}

            <ClubForm
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => loadClubs()}
            />
        </div>
    );
};

export default ClubList;
