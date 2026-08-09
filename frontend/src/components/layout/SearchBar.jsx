import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

const SearchBar = () => {
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(() => searchParams.get('q') || '');
    const navigate = useNavigate();

    const qParam = searchParams.get('q');

    useEffect(() => {
        if (qParam !== null) {
            setQuery(qParam);
        }
    }, [qParam]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            return;
        }
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }, [query, navigate]);

    const handleChange = useCallback((e) => {
        setQuery(e.target.value);
    }, []);

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center w-full min-w-[180px]">
            <Search className="w-4 h-4 text-[#444748] absolute left-3.5 pointer-events-none shrink-0" />
            <input
                type="text"
                placeholder="Search events, clubs..."
                value={query}
                onChange={handleChange}
                maxLength={100}
                className="w-full min-w-0 bg-[#f0eee9] text-[#1b1c19] placeholder-[#444748] text-xs rounded-full pl-10 pr-4 py-2 border border-[#e4e2dd] focus:outline-none focus:border-[#1c1b1b] focus:ring-1 focus:ring-[#1c1b1b] transition-all"
            />
        </form>
    );
};

export default SearchBar;
