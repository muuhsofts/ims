// src/pages/warehouses/WarehouseModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    Box,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useWarehouses } from '@/hooks/useWarehouses';
import { userService } from 'services/user.service';

export default function WarehouseModal({ open, onClose, warehouse }) {
    const { create, update } = useWarehouses();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [form, setForm] = useState({
        name: '',
        location: '',
        manager_id: '',
        status: 'active',
    });

    // Fetch users dropdown when modal opens
    useEffect(() => {
        if (!open) return;
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const response = await userService.getUsersDropdown();
                if (response.data?.success && Array.isArray(response.data.data)) {
                    setUsers(response.data.data);
                } else {
                    setUsers([]);
                }
            } catch (err) {
                console.error(err);
                setUsers([]);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, [open]);

    // Reset form when editing
    useEffect(() => {
        if (warehouse) {
            setForm({
                name: warehouse.name || '',
                location: warehouse.location || '',
                manager_id: warehouse.manager_id || '',
                status: warehouse.status || 'active',
            });
        } else {
            setForm({
                name: '',
                location: '',
                manager_id: '',
                status: 'active',
            });
        }
    }, [warehouse]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            showSnackbar({ type: 'error', message: 'Warehouse name is required' });
            return;
        }

        setLoading(true);
        try {
            if (warehouse) {
                await update(warehouse.warehouse_id, form);
                showSnackbar({ type: 'success', message: 'Warehouse updated successfully' });
            } else {
                await create(form);
                showSnackbar({ type: 'success', message: 'Warehouse created successfully' });
            }
            onClose(true);
        } catch (err) {
            showSnackbar({
                type: 'error',
                message: err.response?.data?.message || err.message || 'Operation failed',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>{warehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Warehouse Name *"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Location"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Manager</InputLabel>
                            <Select
                                name="manager_id"
                                value={form.manager_id}
                                label="Manager"
                                onChange={handleChange}
                                disabled={loadingUsers}
                            >
                                <MenuItem value="">
                                    {loadingUsers ? 'Loading users...' : 'Select a manager (optional)'}
                                </MenuItem>
                                {users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        {user.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                name="status"
                                value={form.status}
                                label="Status"
                                onChange={handleChange}
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="maintenance">Maintenance</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingUsers}>
                        {loading ? <CircularProgress size={24} /> : warehouse ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}