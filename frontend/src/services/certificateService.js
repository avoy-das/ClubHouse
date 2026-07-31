import api from './api';

const certificateService = {
    listMine: async () => (await api.get('/certificates')).data,
    getDownloadUrl: (certificateId) => {
        const token = localStorage.getItem('token');
        return `http://localhost:8000/api/certificates/${certificateId}/download?token=${token}`;
    },
    openDownloadWindow: (certificateId) => {
        const token = localStorage.getItem('token');
        // Fetch via axios or open in new window with bearer token header
        fetch(`http://localhost:8000/api/certificates/${certificateId}/download`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(res => res.text())
        .then(html => {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
        });
    }
};

export default certificateService;
