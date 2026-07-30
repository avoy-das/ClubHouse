import { useEffect, useState } from 'react';
import clubService from '../../services/clubService';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import SuccessBanner from '../ui/SuccessBanner';
import LoadingSpinner from '../ui/LoadingSpinner';

const PositionAssignment = ({ clubId, members = [], onUpdated }) => {
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // New position form
    const [newTitle, setNewTitle] = useState('');
    const [canManageMembers, setCanManageMembers] = useState(false);
    const [canManageEvents, setCanManageEvents] = useState(false);
    const [canManageAnnouncements, setCanManageAnnouncements] = useState(false);
    const [canManageRecruitment, setCanManageRecruitment] = useState(false);
    const [canTrackAttendance, setCanTrackAttendance] = useState(false);

    // Assignment selections
    const [selectedMember, setSelectedMember] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');

    const loadPositions = async () => {
        setLoading(true);
        try {
            const data = await clubService.listPositions(clubId);
            setPositions(data.data || data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load positions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clubId) loadPositions();
    }, [clubId]);

    const handleCreatePosition = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setError(null);
        setSuccess(null);
        try {
            await clubService.createPosition(clubId, {
                title: newTitle,
                can_manage_members: canManageMembers,
                can_manage_events: canManageEvents,
                can_manage_announcements: canManageAnnouncements,
                can_manage_recruitment: canManageRecruitment,
                can_track_attendance: canTrackAttendance,
            });
            setSuccess(`Position "${newTitle}" created.`);
            setNewTitle('');
            setCanManageMembers(false);
            setCanManageEvents(false);
            setCanManageAnnouncements(false);
            setCanManageRecruitment(false);
            setCanTrackAttendance(false);
            loadPositions();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create position.');
        }
    };

    const handleAssignPosition = async (e) => {
        e.preventDefault();
        if (!selectedMember || !selectedPosition) return;
        setError(null);
        setSuccess(null);
        try {
            await clubService.assignPosition(selectedMember, selectedPosition);
            setSuccess('Position assigned successfully.');
            setSelectedMember('');
            setSelectedPosition('');
            if (onUpdated) onUpdated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign position.');
        }
    };

    const handleRevokePosition = async (memberId, positionId) => {
        setError(null);
        setSuccess(null);
        try {
            await clubService.revokePosition(memberId, positionId);
            setSuccess('Position revoked.');
            if (onUpdated) onUpdated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to revoke position.');
        }
    };

    const handleDeletePosition = async (positionId) => {
        setError(null);
        setSuccess(null);
        try {
            await clubService.removePosition(positionId);
            setSuccess('Position deleted.');
            loadPositions();
            if (onUpdated) onUpdated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete position.');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="bg-white p-6 rounded shadow-md mt-6 space-y-6">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Position & Permissions Management</h3>
            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create Position Form */}
                <form onSubmit={handleCreatePosition} className="bg-gray-50 p-4 rounded border space-y-3">
                    <h4 className="font-semibold text-gray-700">Create New Position</h4>
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Vice President, Event Lead"
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 text-xs text-gray-700">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={canManageMembers}
                                onChange={(e) => setCanManageMembers(e.target.checked)}
                            />
                            <span>Manage Members & Requests</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={canManageEvents}
                                onChange={(e) => setCanManageEvents(e.target.checked)}
                            />
                            <span>Manage Events</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={canManageAnnouncements}
                                onChange={(e) => setCanManageAnnouncements(e.target.checked)}
                            />
                            <span>Manage Announcements</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={canManageRecruitment}
                                onChange={(e) => setCanManageRecruitment(e.target.checked)}
                            />
                            <span>Manage Recruitment</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={canTrackAttendance}
                                onChange={(e) => setCanTrackAttendance(e.target.checked)}
                            />
                            <span>Track Event Attendance</span>
                        </label>
                    </div>
                    <Button variant="primary" size="sm" type="submit">
                        Create Position
                    </Button>
                </form>

                {/* Assign Position Form */}
                <form onSubmit={handleAssignPosition} className="bg-gray-50 p-4 rounded border space-y-3">
                    <h4 className="font-semibold text-gray-700">Assign Position to Member</h4>
                    <div>
                        <label className="block text-sm font-medium mb-1">Select Member</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            required
                        >
                            <option value="">-- Choose Member --</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.user?.name || `Member #${m.id}`} ({m.user?.email})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Select Position</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedPosition}
                            onChange={(e) => setSelectedPosition(e.target.value)}
                            required
                        >
                            <option value="">-- Choose Position --</option>
                            {positions.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button variant="primary" size="sm" type="submit">
                        Assign Position
                    </Button>
                </form>
            </div>

            {/* List of positions */}
            <div>
                <h4 className="font-semibold text-gray-700 mb-2">Existing Positions</h4>
                <div className="space-y-2">
                    {positions.map((pos) => (
                        <div key={pos.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border text-sm">
                            <div>
                                <span className="font-bold text-gray-800">{pos.title}</span>
                                <div className="text-xs text-gray-500 space-x-2">
                                    {pos.can_manage_members && <span>[Members]</span>}
                                    {pos.can_manage_events && <span>[Events]</span>}
                                    {pos.can_manage_announcements && <span>[Announcements]</span>}
                                    {pos.can_manage_recruitment && <span>[Recruitment]</span>}
                                    {pos.can_track_attendance && <span>[Attendance]</span>}
                                </div>
                            </div>
                            <Button variant="danger" size="sm" onClick={() => handleDeletePosition(pos.id)}>
                                Delete Position
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Current members position list */}
            <div>
                <h4 className="font-semibold text-gray-700 mb-2">Current Member Assignments</h4>
                <div className="space-y-2">
                    {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border text-sm">
                            <div>
                                <span className="font-medium text-gray-900">{m.user?.name || `Member #${m.id}`}</span>
                                <span className="text-gray-400 text-xs ml-2">({m.user?.email})</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                {m.positions && m.positions.length > 0 ? (
                                    m.positions.map((p) => (
                                        <span key={p.id} className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                            {p.title}
                                            <button
                                                className="ml-1.5 text-red-600 hover:text-red-800 font-bold"
                                                onClick={() => handleRevokePosition(m.id, p.id)}
                                                title="Revoke position"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-gray-400">General Member</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PositionAssignment;
