import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import clubService from '../../services/clubService';
import membershipService from '../../services/membershipService';
import { ClubPermissionsProvider, useClubPermissions } from '../../context/ClubPermissionsContext';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import Modal from '../../components/ui/Modal';
import ClubForm from './ClubForm';

const ClubDetailContent = () => {
    const { clubId } = useParams();
    const navigate = useNavigate();
    const { membership, isExecutive } = useClubPermissions();

    const [club, setClub] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Join modal state
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinMessage, setJoinMessage] = useState('');
    const [joining, setJoining] = useState(false);

    // Edit modal
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Gallery state
    const [galleries, setGalleries] = useState([]);
    const [newImage, setNewImage] = useState('');
    const [newCaption, setNewCaption] = useState('');

    const loadClub = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await clubService.get(clubId);
            setClub(data.data || data);
            
            // fetch gallery images
            try {
                const gData = await clubService.listGalleries(clubId);
                setGalleries(gData.data || gData || []);
            } catch {
                // ignore gallery fail
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load club details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clubId) loadClub();
    }, [clubId]);

    const handleJoinRequest = async (e) => {
        e.preventDefault();
        setJoining(true);
        setError(null);
        try {
            await membershipService.request(clubId, joinMessage);
            setSuccess('Membership request submitted successfully!');
            setIsJoinModalOpen(false);
            loadClub();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setJoining(false);
        }
    };

    const handleAddGallery = async (e) => {
        e.preventDefault();
        if (!newImage) return;
        try {
            await clubService.addGallery(clubId, { image_path: newImage, caption: newCaption });
            setNewImage('');
            setNewCaption('');
            loadClub();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add image');
        }
    };

    const handleRemoveGallery = async (id) => {
        try {
            await clubService.removeGallery(id);
            loadClub();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove image');
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!club) return <ErrorBanner message={error || 'Club not found'} />;

    const myStatus = membership?.status;

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden border">
                <div className="h-32 bg-gradient-to-r from-blue-700 to-indigo-800 p-6 flex justify-between items-end text-white">
                    <div>
                        <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950/60">
                            {club.category}
                        </span>
                        <h1 className="text-3xl font-extrabold text-white mt-1">{club.name}</h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        {club.status && <Badge status={club.status} />}
                        {isExecutive() && (
                            <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
                                Edit Club Info
                            </Button>
                        )}
                    </div>
                </div>

                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b">
                    <div className="text-gray-600 text-sm max-w-3xl">
                        <p>{club.description}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                        {!myStatus && (
                            <Button variant="primary" onClick={() => setIsJoinModalOpen(true)}>
                                Request to Join
                            </Button>
                        )}
                        {myStatus === 'pending' && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-yellow-300">
                                Membership Pending Review
                            </span>
                        )}
                        {myStatus === 'approved' && (
                            <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-300">
                                Active Member
                            </span>
                        )}
                    </div>
                </div>

                {/* Sub-navigation tabs */}
                <div className="flex border-b bg-gray-50 px-6 space-x-6 text-sm font-medium text-gray-600">
                    <button
                        onClick={() => navigate(`/clubs/${clubId}`)}
                        className="py-3 border-b-2 border-blue-600 font-bold text-blue-600"
                    >
                        Overview & Gallery
                    </button>
                    <Link
                        to={`/clubs/${clubId}/members`}
                        className="py-3 border-b-2 border-transparent hover:text-blue-600"
                    >
                        Members
                    </Link>
                    <Link
                        to={`/clubs/${clubId}/events`}
                        className="py-3 border-b-2 border-transparent hover:text-blue-600"
                    >
                        Events
                    </Link>
                    <Link
                        to={`/clubs/${clubId}/announcements`}
                        className="py-3 border-b-2 border-transparent hover:text-blue-600"
                    >
                        Announcements
                    </Link>
                    <Link
                        to={`/clubs/${clubId}/recruitment`}
                        className="py-3 border-b-2 border-transparent hover:text-blue-600"
                    >
                        Recruitment
                    </Link>
                </div>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {/* Gallery Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="text-lg font-bold text-gray-800">Club Gallery</h3>
                </div>

                {isExecutive() && (
                    <form onSubmit={handleAddGallery} className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4 rounded border">
                        <input
                            type="url"
                            placeholder="Image URL..."
                            required
                            className="flex-1 border rounded px-3 py-2 text-sm outline-none"
                            value={newImage}
                            onChange={(e) => setNewImage(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Caption (optional)"
                            className="flex-1 border rounded px-3 py-2 text-sm outline-none"
                            value={newCaption}
                            onChange={(e) => setNewCaption(e.target.value)}
                        />
                        <Button variant="primary" size="sm" type="submit">
                            Add Image
                        </Button>
                    </form>
                )}

                {galleries.length === 0 ? (
                    <p className="text-gray-500 text-sm">No gallery images uploaded yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {galleries.map((img) => (
                            <div key={img.id} className="group relative rounded overflow-hidden border bg-black/5">
                                <img src={img.image_path} alt={img.caption || 'Gallery image'} className="w-full h-48 object-cover" />
                                {img.caption && (
                                    <div className="p-2 text-xs text-gray-700 bg-white border-t">{img.caption}</div>
                                )}
                                {isExecutive() && (
                                    <button
                                        onClick={() => handleRemoveGallery(img.id)}
                                        className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Join Request Modal */}
            <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Join Club Request">
                <form onSubmit={handleJoinRequest} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Message to Executives</label>
                        <textarea
                            rows={3}
                            placeholder="Briefly state why you'd like to join..."
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={joinMessage}
                            onChange={(e) => setJoinMessage(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button variant="secondary" onClick={() => setIsJoinModalOpen(false)} type="button">
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={joining}>
                            {joining ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Edit Club Modal */}
            {isEditOpen && (
                <ClubForm
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    club={club}
                    onSuccess={loadClub}
                />
            )}
        </div>
    );
};

const ClubDetail = () => {
    const { clubId } = useParams();
    return (
        <ClubPermissionsProvider clubId={clubId}>
            <ClubDetailContent />
        </ClubPermissionsProvider>
    );
};

export default ClubDetail;
