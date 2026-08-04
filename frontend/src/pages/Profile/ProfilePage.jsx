import { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import clubService from '../../services/clubService';
import api from '../../services/api';
import { Link } from 'react-router-dom';

const roleLabels = {
    president:      'President',
    vice_president: 'Vice President',
    secretary:      'Secretary',
    treasurer:      'Treasurer',
    member:         'Member',
};

const ProfilePage = () => {
    const { user, setUser } = useAuth();

    const [activeTab, setActiveTab] = useState('overview'); // overview, password, memberships, past_events

    // Edit Profile form state
    const [phone, setPhone] = useState(user?.phone || '');
    const [department, setDepartment] = useState(user?.department || '');
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [profileToast, setProfileToast] = useState(null);

    // Change Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [passwordToast, setPasswordToast] = useState(null);

    // Memberships state
    const [memberships, setMemberships] = useState([]);
    const [loadingMemberships, setLoadingMemberships] = useState(true);
    const [leavingClubId, setLeavingClubId] = useState(null);
    const [membershipToast, setMembershipToast] = useState(null);

    // Past events state
    const [pastEvents, setPastEvents] = useState([]);
    const [loadingPastEvents, setLoadingPastEvents] = useState(true);

    useEffect(() => {
        if (user) {
            setPhone(user.phone || '');
            setDepartment(user.department || '');
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'memberships') {
            fetchMemberships();
        } else if (activeTab === 'past_events') {
            fetchPastEvents();
        }
    }, [activeTab]);

    const fetchPastEvents = async () => {
        setLoadingPastEvents(true);
        try {
            const res = await api.get('/events', {
                params: {
                    registered: 'true',
                    date_preset: 'past',
                }
            });
            const data = res.data?.data || res.data || [];
            setPastEvents(Array.isArray(data) ? data : []);
        } catch {
            setPastEvents([]);
        } finally {
            setLoadingPastEvents(false);
        }
    };

    const fetchMemberships = async () => {
        setLoadingMemberships(true);
        try {
            const data = await authService.getMyMemberships();
            setMemberships(Array.isArray(data) ? data : []);
        } catch {
            setMemberships([]);
        } finally {
            setLoadingMemberships(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdatingProfile(true);
        setProfileToast(null);

        try {
            const res = await authService.updateProfile({ phone, department });
            if (setUser && res.user) {
                setUser(res.user);
            }
            setProfileToast({ type: 'success', message: res.message || 'Profile updated successfully!' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update profile.';
            setProfileToast({ type: 'error', message: msg });
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordToast(null);

        if (newPassword !== newPasswordConfirmation) {
            setPasswordToast({ type: 'error', message: 'New password confirmation does not match.' });
            return;
        }

        setUpdatingPassword(true);
        try {
            const res = await authService.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirmation,
            });
            setPasswordToast({ type: 'success', message: res.message || 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setNewPasswordConfirmation('');
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.new_password?.[0] || 'Failed to update password.';
            setPasswordToast({ type: 'error', message: msg });
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleLeaveClub = async (clubId, clubName, role) => {
        if (['president', 'vice_president', 'secretary', 'treasurer'].includes(role)) {
            alert(`As a club executive (${roleLabels[role] || role}), you must transfer your executive role before leaving ${clubName}.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to leave ${clubName}?`)) return;

        setLeavingClubId(clubId);
        setMembershipToast(null);

        try {
            const res = await clubService.leaveClub(clubId);
            setMembershipToast({ type: 'success', message: res.data.message || `Left ${clubName} successfully.` });
            setMemberships(prev => prev.filter(m => m.club_id !== clubId));
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to leave club.';
            setMembershipToast({ type: 'error', message: msg });
        } finally {
            setLeavingClubId(null);
        }
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return 'N/A';
        return new Date(isoStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Profile Banner */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-inner">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
                                {user?.is_admin && (
                                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
                                        Admin
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                <span>ID: <strong>{user?.student_id || 'N/A'}</strong></span>
                                <span>&bull;</span>
                                <span>{user?.department || 'Department not specified'}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 flex gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                            activeTab === 'overview'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        Profile & Edit
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                            activeTab === 'password'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        Change Password
                    </button>
                    <button
                        onClick={() => setActiveTab('memberships')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                            activeTab === 'memberships'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        My Club Memberships
                    </button>
                    <button
                        onClick={() => setActiveTab('past_events')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                            activeTab === 'past_events'
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        Past Events
                    </button>
                </div>

                {/* Tab 1: Profile & Edit */}
                {activeTab === 'overview' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                You can update your phone number and department. Student ID and email cannot be edited.
                            </p>
                        </div>

                        {profileToast && (
                            <div className={`p-4 rounded-xl text-sm border ${
                                profileToast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                                {profileToast.message}
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Name (Readonly) */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={user?.name || ''}
                                        disabled
                                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                {/* Student ID (Readonly) */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Student ID (Immutable)</label>
                                    <input
                                        type="text"
                                        value={user?.student_id || ''}
                                        disabled
                                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                {/* Email (Readonly) */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Email Address (Immutable)</label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        disabled
                                        className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                                    />
                                </div>

                                {/* Department (Editable) */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        placeholder="e.g. Computer Science & Engineering"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    />
                                </div>

                                {/* Phone (Editable) */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g. +8801700000000"
                                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={updatingProfile}
                                    className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    {updatingProfile ? 'Saving...' : 'Save Profile Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab 2: Change Password */}
                {activeTab === 'password' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Ensure your account is using a strong, unique password.
                            </p>
                        </div>

                        {passwordToast && (
                            <div className={`p-4 rounded-xl text-sm border ${
                                passwordToast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                                {passwordToast.message}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">New Password (Min 8 characters)</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newPasswordConfirmation}
                                    onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={updatingPassword}
                                    className="w-full px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                                >
                                    {updatingPassword ? 'Updating Password...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tab 3: My Club Memberships */}
                {activeTab === 'memberships' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Joined Clubs</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Clubs you are currently a member or executive of.
                            </p>
                        </div>

                        {membershipToast && (
                            <div className={`p-4 rounded-xl text-sm border ${
                                membershipToast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                                {membershipToast.message}
                            </div>
                        )}

                        {loadingMemberships ? (
                            <p className="text-slate-400 text-sm py-4 animate-pulse">Loading club memberships...</p>
                        ) : memberships.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                                <p className="text-slate-500 text-sm mb-3">You have not joined any clubs yet.</p>
                                <Link
                                    to="/clubs"
                                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors inline-block"
                                >
                                    Browse Active Clubs
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {memberships.map((membership) => (
                                    <div key={membership.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700 text-sm">
                                                {membership.club?.name?.charAt(0) || 'C'}
                                            </div>
                                            <div>
                                                <Link
                                                    to={`/clubs/${membership.club_id}`}
                                                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                                                >
                                                    {membership.club?.name || `Club #${membership.club_id}`}
                                                </Link>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span>{membership.club?.category}</span>
                                                    <span>&bull;</span>
                                                    <span>Joined {formatDate(membership.joined_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full capitalize">
                                                {roleLabels[membership.role] || membership.role}
                                            </span>

                                            <button
                                                onClick={() => handleLeaveClub(membership.club_id, membership.club?.name, membership.role)}
                                                disabled={leavingClubId === membership.club_id}
                                                className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                                            >
                                                {leavingClubId === membership.club_id ? 'Leaving...' : 'Leave Club'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 4: Past Events */}
                {activeTab === 'past_events' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">My Past Events</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                A list of every event you registered for in the past.
                            </p>
                        </div>

                        {loadingPastEvents ? (
                            <p className="text-slate-400 text-sm py-4 animate-pulse">Loading past registered events...</p>
                        ) : pastEvents.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
                                <p className="text-slate-500 text-sm mb-3">No past registered events found.</p>
                                <Link
                                    to="/events"
                                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors inline-block"
                                >
                                    Browse Campus Events
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pastEvents.map((ev) => (
                                    <div key={ev.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/events/${ev.id}`}
                                                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                                                >
                                                    {ev.title}
                                                </Link>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                                                    ev.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                                                    ev.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {ev.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                {ev.club && <span className="font-semibold text-blue-600">{ev.club.name}</span>}
                                                <span>&bull;</span>
                                                <span>{new Date(ev.starts_at).toLocaleDateString()}</span>
                                                {ev.location_value && (
                                                    <>
                                                        <span>&bull;</span>
                                                        <span>📍 {ev.location_value}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Link
                                            to={`/events/${ev.id}`}
                                            className="px-3.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-lg transition-colors shrink-0"
                                        >
                                            View Event Details
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </MainLayout>
    );
};

export default ProfilePage;
