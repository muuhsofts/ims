// src/contexts/ReturnsContext.js
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { returnsService } from 'services/returns.service';
import { showSnackbar } from 'utils/snackbar';

// Action types
const ACTION_TYPES = {
    SET_LOADING: 'SET_LOADING',
    SET_DATA: 'SET_DATA',
    SET_TOTAL: 'SET_TOTAL',
    SET_STATISTICS: 'SET_STATISTICS',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    RESET: 'RESET',
};

// Initial state
const initialState = {
    data: [],
    total: 0,
    statistics: null,
    loading: false,
    error: null,
};

// Reducer
const returnsReducer = (state, action) => {
    switch (action.type) {
        case ACTION_TYPES.SET_LOADING:
            return { ...state, loading: action.payload };
        case ACTION_TYPES.SET_DATA:
            return { ...state, data: action.payload };
        case ACTION_TYPES.SET_TOTAL:
            return { ...state, total: action.payload };
        case ACTION_TYPES.SET_STATISTICS:
            return { ...state, statistics: action.payload };
        case ACTION_TYPES.SET_ERROR:
            return { ...state, error: action.payload };
        case ACTION_TYPES.CLEAR_ERROR:
            return { ...state, error: null };
        case ACTION_TYPES.RESET:
            return initialState;
        default:
            return state;
    }
};

// Context
const ReturnsContext = createContext(null);

// Provider
export const ReturnsProvider = ({ children }) => {
    const [state, dispatch] = useReducer(returnsReducer, initialState);

    // Fetch all returns
    const fetchReturns = useCallback(async (params = {}) => {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
        try {
            const response = await returnsService.getReturns(params);
            if (response.data?.success) {
                dispatch({ type: ACTION_TYPES.SET_DATA, payload: response.data.data.data || [] });
                dispatch({ type: ACTION_TYPES.SET_TOTAL, payload: response.data.data.total || 0 });
            }
            return response.data;
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to fetch returns';
            dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMsg });
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
        }
    }, []);

    // Fetch statistics
    const fetchStatistics = useCallback(async () => {
        try {
            const response = await returnsService.getStatistics();
            if (response.data?.success) {
                dispatch({ type: ACTION_TYPES.SET_STATISTICS, payload: response.data.data });
                return response.data.data;
            }
            return null;
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to fetch statistics';
            showSnackbar({ type: 'error', message: errorMsg });
            return null;
        }
    }, []);

    // Create return
    const createReturn = useCallback(async (data) => {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        try {
            const response = await returnsService.createReturn(data);
            if (response.data?.success) {
                showSnackbar({
                    type: 'success',
                    message: response.data.message || 'Return created successfully'
                });
                // Refresh the list
                await fetchReturns();
                return response.data.data;
            }
            throw new Error('Failed to create return');
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to create return';
            dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMsg });
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
        }
    }, [fetchReturns]);

    // Submit return
    const submitReturn = useCallback(async (id, data) => {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        try {
            const response = await returnsService.submitReturn(id, data);
            if (response.data?.success) {
                showSnackbar({
                    type: 'success',
                    message: response.data.message || 'Return submitted successfully'
                });
                await fetchReturns();
                return response.data.data;
            }
            throw new Error('Failed to submit return');
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to submit return';
            dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMsg });
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
        }
    }, [fetchReturns]);

    // Cancel return
    const cancelReturn = useCallback(async (id) => {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        try {
            const response = await returnsService.cancelReturn(id);
            if (response.data?.success) {
                showSnackbar({
                    type: 'success',
                    message: response.data.message || 'Return cancelled successfully'
                });
                await fetchReturns();
                return response.data.data;
            }
            throw new Error('Failed to cancel return');
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to cancel return';
            dispatch({ type: ACTION_TYPES.SET_ERROR, payload: errorMsg });
            showSnackbar({ type: 'error', message: errorMsg });
            throw err;
        } finally {
            dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
        }
    }, [fetchReturns]);

    // Validate IMEI
    const validateImei = useCallback(async (imei) => {
        try {
            const response = await returnsService.validateImei(imei);
            if (response.data?.success) {
                return response.data.data;
            }
            return { valid: false, message: 'Validation failed' };
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err.message || 'Failed to validate IMEI';
            showSnackbar({ type: 'error', message: errorMsg });
            return { valid: false, message: errorMsg };
        }
    }, []);

    const value = {
        ...state,
        fetchReturns,
        fetchStatistics,
        createReturn,
        submitReturn,
        cancelReturn,
        validateImei,
        reset: () => dispatch({ type: ACTION_TYPES.RESET }),
    };

    return (
        <ReturnsContext.Provider value={value}>
            {children}
        </ReturnsContext.Provider>
    );
};

// Custom hook to use returns context
export const useReturnsContext = () => {
    const context = useContext(ReturnsContext);
    if (!context) {
        throw new Error('useReturnsContext must be used within a ReturnsProvider');
    }
    return context;
};