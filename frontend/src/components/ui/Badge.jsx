const Badge = ({ status, children }) => {
    const text = children || status;
    const lower = (status || '').toLowerCase();

    const styles = {
        pending: 'bg-amber-100 text-amber-800 border-amber-200',
        approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        open: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        registered: 'bg-blue-100 text-blue-800 border-blue-200',
        interview: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        rejected: 'bg-rose-100 text-rose-800 border-rose-200',
        suspended: 'bg-rose-100 text-rose-800 border-rose-200',
        cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
        closed: 'bg-gray-100 text-gray-700 border-gray-200',
        draft: 'bg-gray-100 text-gray-700 border-gray-200',
        removed: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const style = styles[lower] || 'bg-gray-100 text-gray-700 border-gray-200';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${style}`}>
            {text}
        </span>
    );
};

export default Badge;
