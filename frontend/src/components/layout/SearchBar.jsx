import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SearchBar = () => {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const qParam = searchParams.get('q');
        if (qParam) {
            setQuery(qParam);
        }
    }, [searchParams]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            return; // Do not submit if less than 2 characters
        }
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    };

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
                type="text"
                placeholder="Search clubs, events..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={100}
                className="w-44 sm:w-60 md:w-72 bg-slate-800 text-white placeholder-slate-400 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700 transition-all"
            />
            <svg
                className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
        </form>
    );
};

export default SearchBar;
