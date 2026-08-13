import MainLayout from '../../layouts/MainLayout';
import UserManagementSection from '../../components/admin/UserManagementSection';
import usePageTitle from '../../hooks/usePageTitle';

const AdminUsers = () => {
    usePageTitle('Admin — Users');
    return (
        <MainLayout>
            <UserManagementSection />
        </MainLayout>
    );
};

export default AdminUsers;
