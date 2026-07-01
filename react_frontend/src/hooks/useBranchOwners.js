// src/hooks/useBranchOwners.js
import { useState, useCallback } from 'react';
import { userService } from 'services/user.service';

export const useBranchOwners = () => {
    const [branchOwners, setBranchOwners] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchBranchOwners = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const response = await userService.getBranchOwners(params);
            if (response.data?.success) {
                setBranchOwners(response.data.data);
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching branch owners:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBranchOwnersDropdown = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const response = await userService.getBranchOwnersDropdown(params);
            if (response.data?.success) {
                setBranchOwners(response.data.data);
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching branch owners dropdown:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        branchOwners,
        loading,
        fetchBranchOwners,
        fetchBranchOwnersDropdown,
    };
};