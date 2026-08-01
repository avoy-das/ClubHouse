import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import certificateService from '../../services/certificateService';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { GraduationCap, Download, Award, FileCheck } from 'lucide-react';

const MyCertificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCertificates = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await certificateService.listMine();
            const list = res.data || res;
            setCertificates(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load certificates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCertificates();
    }, []);

    const handleDownload = (certId) => {
        certificateService.openDownloadWindow(certId);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <GraduationCap className="w-6 h-6 text-blue-600" /> My Certificates
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">Official verified participation certificates for attended events.</p>
                </div>

                {error && <ErrorBanner message={error} />}

                {loading ? (
                    <LoadingSpinner />
                ) : certificates.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-xl shadow-xs border border-slate-200 text-slate-500">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-[#0b1c30] mx-auto flex items-center justify-center mb-3">
                            <Award className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-base font-medium">No certificates earned yet.</p>
                        <p className="text-sm mt-1">Attend club events and get marked as present to earn certificates.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {certificates.map((cert) => (
                            <Card key={cert.id} className="flex flex-col justify-between hover:shadow-xs transition border-slate-200 bg-white rounded-xl p-6">
                                <div>
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shrink-0">
                                            <FileCheck className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#0b1c30] text-base leading-snug">
                                                {cert.registration?.event?.title || 'Event Certificate'}
                                            </h3>
                                            <span className="text-xs font-mono text-[#2563eb] bg-[#eff4ff] border border-blue-200/60 px-2 py-0.5 rounded-md inline-block mt-1">
                                                #{cert.certificate_number || cert.id}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 space-y-1 mb-4">
                                        <div>
                                            Issued:{' '}
                                            <span className="font-medium text-[#0b1c30]">
                                                {new Date(cert.issued_at || cert.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => handleDownload(cert.id)}
                                        className="w-full py-2 bg-[#2563eb] hover:bg-[#0051d5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                                    >
                                        <Download className="w-4 h-4" /> Download Certificate PDF
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default MyCertificates;
