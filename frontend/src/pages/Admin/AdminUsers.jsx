import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import adminService from '../../services/adminService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBanner from '../../components/ui/ErrorBanner';
import SuccessBanner from '../../components/ui/SuccessBanner';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Shield, Users, Search, Edit2, Trash2, Eye, UserCheck, CheckCircle, Building } from 'lucide-react';

const AdminUsers = () => {
    const [searchParams] = useSearchParams();
    const highlightUserId = searchParams.get('user');

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

            // Auto inspect if user query parameter is provided
            if (highlightUserId) {
                const found = userArray.find((u) => String(u.id) === String(highlightUserId));
                if (found) {
                    openInspectModal(found);
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [highlightUserId]);

    const openInspectModal = (user) => {
        setSelectedUser(user);
        setEditForm({
            name: user.name || '',
            department: user.department || '',
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
            const updated = await adminService.updateUser(selectedUser.id, editForm);
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

    // Filter users by search query (Name, Email, Student ID, Department)
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

    // Helper to format club roles
    const getClubRoles = (user) => {
        const memberships = user.club_memberships || user.clubs || [];
        if (!Array.isArray(memberships) || memberships.length === 0) {
            return { type: 'none', label: 'No Club Membership' };
        }

        const execMembership = memberships.find(
            (m) => m.role === 'executive' || m.role === 'president' || (m.positions && m.positions.length > 0)
        );

        if (execMembership) {
            const clubName = execMembership.club?.name || 'Club';
            const roleName = execMembership.role === 'president' ? 'President' : 'Executive';
            return { type: 'exec', label: `${roleName} (${clubName})` };
        }

        if (memberships.length === 1) {
            return { type: 'member', label: `Member (${memberships[0].club?.name || '1 Club'})` };
        }

        return { type: 'member', label: `Member (${memberships.length} Clubs)` };
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-xs border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
                            <Shield className="w-6 h-6 text-amber-500" /> Admin — User Management Directory
                        </h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            Inspect user profiles, manage system roles, edit accounts, or deactivate users across ClubHouse.
                        </p>
                    </div>
                    <div className="flex space-x-2 text-xs font-semibold shrink-0">
                        <Link to="/admin/audit-logs" className="px-3.5 py-2 bg-[#f8f9ff] hover:bg-slate-100 rounded-lg border border-slate-200 text-[#0b1c30] transition-colors">
                            Audit Logs
                        </Link>
                    </div>
                </div>

                {error && <ErrorBanner message={error} />}
                {success && <SuccessBanner message={success} />}

                {/* Directory Controls & Table */}
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                    {/* Top Search Bar & Counter */}
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f8f9ff]/50">
                        <div className="flex items-center gap-2 font-bold text-[#0b1c30]">
                            <Users className="w-5 h-5 text-blue-600" />
                            <span>System Users</span>
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-extrabold">
                                {filteredUsers.length} / {users.length}
                            </span>
                        </div>

                        {/* Real-time Filter */}
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
                                        <th className="p-3.5">Registered</th>
                                        <th className="p-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((u) => {
                                        const clubRole = getClubRoles(u);
                                        const isHighlighted = highlightUserId && String(u.id) === String(highlightUserId);

                                        return (
                                            <tr
                                                key={u.id}
                                                className={`transition-colors ${
                                                    isHighlighted ? 'bg-amber-50/80 border-l-4 border-l-amber-500' : 'hover:bg-[#f8f9ff]/60'
                                                }`}
                                            >
                                                {/* User Info */}
                                                <td className="p-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-[#0b1c30] text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-[#0b1c30] flex items-center gap-1.5">
                                                                {u.name}
                                                                {isHighlighted && (
                                                                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[10px] font-extrabold rounded">
                                                                        Targeted
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-500 font-mono">{u.student_id}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Contact & Department */}
                                                <td className="p-3.5 text-xs">
                                                    <div className="font-medium text-slate-800">{u.email}</div>
                                                    <div className="text-slate-500">
                                                        {u.department || 'N/A'} {u.phone ? `• ${u.phone}` : ''}
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
                                                    {clubRole.type === 'exec' ? (
                                                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                                            <Building className="w-3 h-3 text-indigo-600" />
                                                            {clubRole.label}
                                                        </span>
                                                    ) : clubRole.type === 'member' ? (
                                                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                                            {clubRole.label}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-0.5 rounded-full font-medium">
                                                            No Club
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Registered Date */}
                                                <td className="p-3.5 text-xs text-slate-500">
                                                    {new Date(u.created_at).toLocaleDateString()}
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
                                                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                                                                u.is_admin
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

                        {/* Edit Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={editForm.name}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Edit Department */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                            <input
                                type="text"
                                value={editForm.department}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Edit Phone */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </MainLayout>
    );
};

export default AdminUsers;
