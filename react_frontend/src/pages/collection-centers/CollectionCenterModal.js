// src/pages/collection-centers/CollectionCenterModal.js
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
    useMediaQuery,
    useTheme
} from '@mui/material';
import { showSnackbar } from 'utils/snackbar';
import { useCollectionCenters } from '@/hooks/useCollectionCenters';
import { userService } from 'services/user.service';

export default function CollectionCenterModal({ open, onClose, center }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useCollectionCenters();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [form, setForm] = useState({
        cc_name: '',
        location: '',
        owner_id: '',
        status: 'active',
    });

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

    useEffect(() => {
        if (center) {
            setForm({
                cc_name: center.cc_name || '',
                location: center.location || '',
                owner_id: center.owner_id || '',
                status: center.status || 'active',
            });
        } else {
            setForm({
                cc_name: '',
                location: '',
                owner_id: '',
                status: 'active',
            });
        }
    }, [center]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.cc_name.trim()) {
            showSnackbar({ type: 'error', message: 'Center name is required' });
            return;
        }
        if (!form.owner_id) {
            showSnackbar({ type: 'error', message: 'Please select an owner' });
            return;
        }

        setLoading(true);
        try {
            if (center) {
                await update(center.cc_id, form);
                showSnackbar({ type: 'success', message: 'Center updated successfully' });
            } else {
                await create(form);
                showSnackbar({ type: 'success', message: 'Center created successfully' });
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
        <Dialog
            open={open}
            onClose={() => onClose(false)}
            maxWidth="sm"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    {center ? 'Edit Collection Center' : 'Add New Collection Center'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Center Name *"
                            name="cc_name"
                            value={form.cc_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            autoFocus
                            size="small"
                        />
                        <TextField
                            label="Location"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />
                        <FormControl fullWidth required size="small">
                            <InputLabel>Owner *</InputLabel>
                            <Select
                                name="owner_id"
                                value={form.owner_id}
                                label="Owner *"
                                onChange={handleChange}
                                disabled={loadingUsers}
                            >
                                <MenuItem value="">
                                    {loadingUsers ? 'Loading owners...' : 'Select an owner'}
                                </MenuItem>
                                {users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        {user.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                name="status"
                                value={form.status}
                                label="Status"
                                onChange={handleChange}
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="on_maintenance">On Maintenance</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingUsers}>
                        {loading ? <CircularProgress size={24} /> : center ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}