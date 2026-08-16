export const roleLabels = {
    president: 'President',
    vice_president: 'Vice President',
    secretary: 'Secretary',
    treasurer: 'Treasurer',
    executive: 'Executive',
    member: 'General Member',
};

export const getRoleRank = (roleStr) => {
    switch ((roleStr || 'member').toLowerCase()) {
        case 'president': return 10;
        case 'vice_president':
        case 'vice president':
        case 'vp': return 9;
        case 'secretary': return 8;
        case 'treasurer': return 8;
        case 'executive': return 7;
        default: return 1;
    }
};

export const committeeRoleWeight = {
    president: 1,
    vice_president: 2,
    secretary: 3,
    treasurer: 4,
    executive: 5,
};
