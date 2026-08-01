import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import certificateService from '../../services/certificateService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';

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
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h1 className="text-2xl font-bold text-gray-900">My Certificates</h1>
                    <p className="text-gray-500 text-sm">Official verified participation certificates for attended events.</p>
                </div>

                {error && <ErrorBanner message={error} />}

                {loading ? (
                    <LoadingSpinner />
                ) : certificates.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-lg shadow-sm border text-gray-500">
                        <div className="text-4xl mb-2">🎓</div>
                        <p className="text-lg font-medium">No certificates earned yet.</p>
                        <p className="text-sm mt-1">Attend club events and get marked as present to earn certificates.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {certificates.map((cert) => (
                            <Card key={cert.id} className="flex flex-col justify-between hover:shadow-md transition border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
                                <div>
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
                                            🎓
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-base">
                                                {cert.registration?.event?.title || 'Event Certificate'}
                                            </h3>
                                            <span className="text-xs font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                                #{cert.certificate_number || cert.id}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1 mb-4">
                                        <div>
                                            Issued:{' '}
                                            <span className="font-medium text-gray-800">
                                                {new Date(cert.issued_at || cert.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3 border-t">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleDownload(cert.id)}
                                    >
                                        📥 Download Certificate PDF
                                    </Button>
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
