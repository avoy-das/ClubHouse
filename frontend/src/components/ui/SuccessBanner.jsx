const SuccessBanner = ({ message, className = '' }) => {
    if (!message) return null;

    return (
        <div className={`bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg border border-emerald-200 text-sm font-medium mb-4 flex items-center gap-2 ${className}`}>
            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
        </div>
    );
};

export default SuccessBanner;
