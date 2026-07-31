import { useEffect, useState } from 'react';
import membershipService from '../../services/membershipService';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ErrorBanner from '../ui/ErrorBanner';
import SuccessBanner from '../ui/SuccessBanner';
import LoadingSpinner from '../ui/LoadingSpinner';

const MembershipRequestList = ({ clubId, onRequestProcessed }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const loadRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await membershipService.listForClub(clubId);
            const list = data.data || data;
            setRequests(Array.isArray(list) ? list : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load membership requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clubId) loadRequests();
    }, [clubId]);

    const handleReview = async (requestId, status) => {
        setProcessingId(requestId);
        setError(null);
        setSuccess(null);
        try {
            await membershipService.review(requestId, status);
            setSuccess(`Request ${status} successfully.`);
            loadRequests();
            if (onRequestProcessed) onRequestProcessed();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${status} request.`);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded shadow-md mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Pending Membership Requests</h3>
            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {requests.length === 0 ? (
                <p className="text-gray-500 text-sm">No pending membership requests.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                            <tr>
                                <th className="p-3">User</th>
                                <th className="p-3">Message</th>
                                <th className="p-3">Requested At</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {requests.map((req) => (
                                <tr key={req.id}>
                                    <td className="p-3 font-medium text-gray-900">
                                        {req.user?.name || `User #${req.user_id}`}
                                        <div className="text-xs text-gray-400">{req.user?.email}</div>
                                    </td>
                                    <td className="p-3">{req.message || 'No message'}</td>
                                    <td className="p-3">
                                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="p-3">
                                        <Badge status={req.status} />
                                    </td>
                                    <td className="p-3 text-right space-x-2">
                                        {req.status === 'pending' && (
                                            <>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    disabled={processingId === req.id}
                                                    onClick={() => handleReview(req.id, 'approved')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    disabled={processingId === req.id}
                                                    onClick={() => handleReview(req.id, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MembershipRequestList;
