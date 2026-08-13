import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import usePageTitle from '../../hooks/usePageTitle';

const NotFound = () => {
    usePageTitle('404 Page Not Found');

    return (
        <div className="min-h-screen bg-[#fbf9f4] flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                    <FileQuestion className="w-8 h-8" />
                </div>
                
                <h1 className="text-3xl font-extrabold text-[#0b1c30] tracking-tight mb-2">
                    Page Not Found
                </h1>
                
                <p className="text-slate-600 text-sm mb-8 leading-relaxed">
                    The page you are looking for does not exist, has been removed, or is temporarily unavailable.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                        to="/dashboard"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0b1c30] text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-xs"
                    >
                        <Home className="w-4 h-4" />
                        Go to Dashboard
                    </Link>

                    <button
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
