import { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorBanner from '../ui/ErrorBanner';
import SuccessBanner from '../ui/SuccessBanner';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Shield, Users, Search, Trash2, Eye, UserCheck, Building } from 'lucide-react';
import { formatSessionLabel, generateSessionOptions } from '../../utils/sessionUtils';

const UserManagementSection = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for Inspect & Edit
    const [selectedUser, setSelectedUser] = useState(null);
    const [isInspectOpen, setIsInspectOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        department: '',
        session: '',
        phone: '',
        is_admin: false,
    });
    const [isSaving, setIsSaving] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getUsers();
            const list = data.data || data;
            const userArray = Array.isArray(list) ? list : [];
            setUsers(userArray);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const openInspectModal = (user) => {
        setSelectedUser(user);
        setEditForm({
            name: user.name || '',
            department: user.department || '',
            session: user.session !== undefined && user.session !== null ? String(user.session) : '',
            phone: user.phone || '',
            is_admin: Boolean(user.is_admin),
        });
        setIsInspectOpen(true);
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const payload = {
                ...editForm,
                session: editForm.session !== '' ? parseInt(editForm.session, 10) : null,
            };
            const updated = await adminService.updateUser(selectedUser.id, payload);
            setSuccess(`User profile for "${updated.name || selectedUser.name}" updated successfully.`);
            setIsInspectOpen(false);
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update user profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleAdmin = async (userId, currentIsAdmin) => {
        setUpdatingId(userId);
        setError(null);
        setSuccess(null);
        try {
            await adminService.updateUser(userId, { is_admin: !currentIsAdmin });
            setSuccess(`User admin privileges ${!currentIsAdmin ? 'granted' : 'revoked'} successfully.`);
            if (selectedUser && selectedUser.id === userId) {
                setSelectedUser((prev) => ({ ...prev, is_admin: !currentIsAdmin }));
                setEditForm((prev) => ({ ...prev, is_admin: !currentIsAdmin }));
            }
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update admin role.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeactivateUser = async (userId) => {
        if (!window.confirm('Are you sure you want to deactivate/delete this user? Their login sessions will be immediately revoked.')) return;
        setUpdatingId(userId);
        setError(null);
        setSuccess(null);
        try {
            await adminService.deleteUser(userId);
            setSuccess('User account deactivated successfully.');
            if (selectedUser && selectedUser.id === userId) {
                setIsInspectOpen(false);
            }
            loadUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to deactivate user.');
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredUsers = users.filter((u) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.student_id && u.student_id.toLowerCase().includes(q)) ||
            (u.department && u.department.toLowerCase().includes(q))
        );
    });

    const getClubRoles = (user) => {
        const memberships = user.club_memberships || user.clubs || [];
        if (!Array.isArray(memberships) || memberships.length === 0) {
            return { items: [], primary: null, count: 0 };
        }

        const items = memberships.map((m) => {
            const clubName = m.club?.name || 'Club';
            const execPosition = m.positions?.find((p) => p.position?.is_executive);
            const isExec = m.role === 'executive' || m.role === 'president' || Boolean(execPosition);
            const roleTitle = execPosition?.position?.title || (m.role === 'president' ? 'President' : m.role === 'executive' ? 'Executive' : 'Member');
            return {
                clubName,
                roleTitle,
                isExec,
                status: m.status || 'approved',
            };
        });

        // Primary is executive first, or first item
        const execItem = items.find((i) => i.isExec);
        const primary = execItem || items[0];

        return {
            items,
            primary,
            count: items.length,
        };
    };

    return (
        <div className="space-y-4 pt-4">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-xs border border-slate-200">
                <div>
                    <h2 className="text-xl font-bold text-[#0b1c30] flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" /> User Management Directory
                    </h2>
                    <p className="text-slate-500 text-xs mt-0.5">
                        Inspect user profiles, manage system administrator roles, or deactivate accounts.
                    </p>
                </div>
            </div>

            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {/* Table Container */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                {/* Search Bar & Stats */}
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f8f9ff]/50">
                    <div className="flex items-center gap-2 font-bold text-[#0b1c30] text-sm">
                        <span>Total Users:</span>
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-extrabold">
                            {filteredUsers.length} / {users.length}
                        </span>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by name, email, student ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12">
                        <LoadingSpinner />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">
                        No users found matching '{searchQuery}'.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-[#f8f9ff] text-[#0b1c30] uppercase text-xs font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-3.5">User</th>
                                    <th className="p-3.5">Contact & Dept</th>
                                    <th className="p-3.5">System Role</th>
                                    <th className="p-3.5">Club Affiliation</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map((u) => {
                                    const clubRole = getClubRoles(u);

                                    return (
                                        <tr key={u.id} className="hover:bg-[#f8f9ff]/60 transition-colors">
                                            {/* User Info */}
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-[#0b1c30] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[#0b1c30]">{u.name}</div>
                                                        <div className="text-xs text-slate-500 font-mono">{u.student_id}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact & Department */}
                                            <td className="p-3.5 text-xs">
                                                <div className="font-medium text-slate-800">{u.email}</div>
                                                <div className="text-slate-500">
                                                    {u.department || 'N/A'} {u.session !== null && u.session !== undefined ? `• Session: ${formatSessionLabel(u.session)}` : ''} {u.phone ? `• ${u.phone}` : ''}
                                                </div>
                                            </td>

                                            {/* System Role */}
                                            <td className="p-3.5">
                                                {u.is_admin ? (
                                                    <span className="bg-[#ffdf9a]/40 text-[#5a4300] border border-[#eab308]/40 text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                                        <Shield className="w-3 h-3 text-amber-600" />
                                                        System Admin
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                                                        <UserCheck className="w-3 h-3 text-slate-500" />
                                                        Student / Member
                                                    </span>
                                                )}
                                            </td>

                                            {/* Club Affiliation Role */}
                                            <td className="p-3.5">
                                                {clubRole.count === 0 ? (
                                                    <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                                        No Club
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {/* Primary Club Badge */}
                                                        <span
                                                            className={`text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border ${
                                                                clubRole.primary.isExec
                                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                                                            }`}
                                                        >
                                                            <Building className={`w-3 h-3 ${clubRole.primary.isExec ? 'text-indigo-600' : 'text-blue-600'}`} />
                                                            {clubRole.primary.roleTitle} ({clubRole.primary.clubName})
                                                        </span>

                                                        {/* Popover / Tooltip Count Badge for additional clubs */}
                                                        {clubRole.count > 1 && (
                                                            <div className="relative group inline-block">
                                                                <button
                                                                    type="button"
                                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[11px] px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer"
                                                                >
                                                                    +{clubRole.count - 1} more
                                                                </button>

                                                                {/* Popover Card */}
                                                                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block group-focus-within:block z-30 w-64 p-3 bg-white rounded-xl shadow-xl border border-slate-200 text-xs space-y-2">
                                                                    <div className="font-bold text-[#0b1c30] border-b border-slate-100 pb-1 flex items-center justify-between">
                                                                        <span>All Affiliations ({clubRole.count})</span>
                                                                    </div>
                                                                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                                                                        {clubRole.items.map((item, idx) => (
                                                                            <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                                                                                <span className="font-medium text-slate-800 truncate pr-2">{item.clubName}</span>
                                                                                <span
                                                                                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold ${
                                                                                        item.isExec ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                                                                                    }`}
                                                                                >
                                                                                    {item.roleTitle}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openInspectModal(u)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                                        title="Inspect / Edit User"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        disabled={updatingId === u.id}
                                                        onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                                                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${u.is_admin
                                                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        title={u.is_admin ? 'Demote to regular user' : 'Promote to System Admin'}
                                                    >
                                                        {u.is_admin ? 'Demote Admin' : 'Make Admin'}
                                                    </button>

                                                    <button
                                                        disabled={updatingId === u.id}
                                                        onClick={() => handleDeactivateUser(u.id)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100 disabled:opacity-50"
                                                        title="Deactivate Account"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Inspect & Edit User Modal */}
            {selectedUser && (
                <Modal
                    isOpen={isInspectOpen}
                    onClose={() => setIsInspectOpen(false)}
                    title={`Inspect Account: ${selectedUser.name}`}
                >
                    <form onSubmit={handleSaveUser} className="space-y-4">
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 p-4 bg-[#f8f9ff] rounded-xl border border-slate-200">
                            <div className="w-12 h-12 bg-[#0b1c30] text-white rounded-full flex items-center justify-center font-bold text-lg">
                                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="font-bold text-[#0b1c30] text-base">{selectedUser.name}</h3>
                                <p className="text-slate-500 text-xs font-mono">{selectedUser.student_id} • {selectedUser.email}</p>
                                <div className="pt-1 flex gap-2">
                                    {selectedUser.is_admin && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                                            System Administrator
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Club Affiliations Overview in Modal */}
                        {(() => {
                            const roles = getClubRoles(selectedUser);
                            if (roles.count === 0) return null;
                            return (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                        <Building className="w-3.5 h-3.5 text-slate-500" />
                                        Club Affiliations ({roles.count})
                                    </div>
                                    <div className="space-y-1.5">
                                        {roles.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                                                <span className="font-medium text-slate-800">{item.clubName}</span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        item.isExec ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                                                    }`}
                                                >
                                                    {item.roleTitle}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Edit Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={editForm.name}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Edit Department */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                            <input
                                type="text"
                                value={editForm.department}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Edit Session */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Academic Session</label>
                            <select
                                value={editForm.session}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, session: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="">None / Not Specified</option>
                                {generateSessionOptions().map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Edit Phone */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Admin Privilege Checkbox */}
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <input
                                type="checkbox"
                                id="is_admin_check"
                                checked={editForm.is_admin}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, is_admin: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <label htmlFor="is_admin_check" className="text-xs font-bold text-slate-800 cursor-pointer">
                                Grant System Administrator Privileges
                            </label>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => handleDeactivateUser(selectedUser.id)}
                                className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                            >
                                Deactivate Account
                            </button>

                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => setIsInspectOpen(false)} type="button">
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Profile Changes'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default UserManagementSection;
