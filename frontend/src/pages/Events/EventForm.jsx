import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ErrorBanner from '../../components/ui/ErrorBanner';
import eventService from '../../services/eventService';

const EventForm = ({ isOpen, onClose, clubId, eventItem = null, onSuccess }) => {
    const [title, setTitle] = useState(eventItem?.title || '');
    const [description, setDescription] = useState(eventItem?.description || '');
    const [venue, setVenue] = useState(eventItem?.venue || '');
    const [capacity, setCapacity] = useState(eventItem?.capacity || '');
    const [startAt, setStartAt] = useState(eventItem?.start_at ? eventItem.start_at.slice(0, 16) : '');
    const [endAt, setEndAt] = useState(eventItem?.end_at ? eventItem.end_at.slice(0, 16) : '');
    const [registrationDeadline, setRegistrationDeadline] = useState(
        eventItem?.registration_deadline ? eventItem.registration_deadline.slice(0, 16) : ''
    );
    const [status, setStatus] = useState(eventItem?.status || 'draft');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const payload = {
                title,
                description,
                venue,
                capacity: capacity ? parseInt(capacity, 10) : null,
                start_at: startAt,
                end_at: endAt || null,
                registration_deadline: registrationDeadline || null,
                status,
            };

            if (eventItem?.id) {
                await eventService.update(eventItem.id, payload);
            } else {
                await eventService.create(clubId, payload);
            }

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save event.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={eventItem ? 'Edit Event' : 'Create New Event'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <ErrorBanner message={error} />}

                <div>
                    <label className="block text-sm font-medium mb-1">Event Title</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Venue / Platform</label>
                    <input
                        type="text"
                        placeholder="Auditorium A / Zoom link"
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Max Capacity (Optional)</label>
                        <input
                            type="number"
                            min="1"
                            placeholder="Unlimited if empty"
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                        <input
                            type="datetime-local"
                            required
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={startAt}
                            onChange={(e) => setStartAt(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">End Date & Time</label>
                        <input
                            type="datetime-local"
                            className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={endAt}
                            onChange={(e) => setEndAt(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Registration Deadline</label>
                    <input
                        type="datetime-local"
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={registrationDeadline}
                        onChange={(e) => setRegistrationDeadline(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        rows={4}
                        required
                        className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : eventItem ? 'Update Event' : 'Create Event'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default EventForm;
