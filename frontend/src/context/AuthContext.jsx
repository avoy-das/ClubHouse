import { createContext, useContext, useEffect, useState, useRef } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);
    const fetchedRef            = useRef(false);

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const loadUser = async () => {
            if (authService.isLoggedIn()) {
                try {
                    const data = await authService.me();
                    setUser(data);
                } catch {
                    localStorage.removeItem('token');
                    setUser(null);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (credentials) => {
        const data = await authService.login(credentials);
        setUser(data.user);
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch {
            // Ignore unauthenticated or expired token errors during logout cleanup
        } finally {
            setUser(null);
        }
    };

    const isAdmin = () => user?.is_admin === true;

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);