import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';
import clubService from '../../services/clubService';

const ClubForm = ({ isOpen, onClose, club = null, onSuccess }) => {
    const [name, setName] = useState(club?.name || '');
    const [slug, setSlug] = useState(club?.slug || '');
    const [description, setDescription] = useState(club?.description || '');
    const [category, setCategory] = useState(club?.category || 'academic');
    const [logoPath, setLogoPath] = useState(club?.logo_path || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const payload = {
                name,
                slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
                description,
                category,
                logo_path: logoPath,
            };

            if (club?.id) {
                await clubService.update(club.id, payload);
            } else {
                await clubService.create(payload);
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save club.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={club ? 'Edit Club' : 'Create New Club Request'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <ErrorBanner message={error} />}

                <div>
                    <label className="block text-sm font-medium mb-1">Club Name</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (!club) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                        }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Slug</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="academic">Academic & Tech</option>
                        <option value="cultural">Cultural & Arts</option>
                        <option value="sports">Sports & Gaming</option>
                        <option value="social">Social & Community</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Logo URL (Optional)</label>
                    <input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={logoPath}
                        onChange={(e) => setLogoPath(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        rows={4}
                        required
                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : club ? 'Update Club' : 'Submit Request'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ClubForm;
