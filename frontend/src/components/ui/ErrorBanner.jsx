const ErrorBanner = ({ message, className = '' }) => {
    if (!message) return null;

    return (
        <div className={`bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200 text-sm font-medium mb-4 flex items-center gap-2 ${className}`}>
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
        </div>
    );
};

export default ErrorBanner;
