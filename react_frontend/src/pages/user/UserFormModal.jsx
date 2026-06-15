// src/pages/users/UserFormModal.js
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
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { useUsers } from "context/UserContext";
import { roleService } from "services/role.service";
import { collectionCenterService } from "services/collection-center.service";
import { showSnackbar } from "utils/snackbar";

export default function UserFormModal({ open, onClose, user }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useUsers();
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [collectionCenters, setCollectionCenters] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        role_id: '',
        cc_id: '',
        password: '',
        password_confirmation: '',
        status: 'active',
    });

    useEffect(() => {
        if (!open) return;
        const fetchOptions = async () => {
            setLoadingOptions(true);
            try {
                const [rolesRes, centersRes] = await Promise.all([
                    roleService.getRolesDropdown(),
                    collectionCenterService.getCentersDropdown()
                ]);
                if (rolesRes.data?.success && Array.isArray(rolesRes.data.data)) {
                    setRoles(rolesRes.data.data);
                } else {
                    setRoles([]);
                }
                if (centersRes.data?.success && Array.isArray(centersRes.data.data)) {
                    setCollectionCenters(centersRes.data.data);
                } else {
                    setCollectionCenters([]);
                }
            } catch (err) {
                console.error('Failed to load options', err);
                showSnackbar({ type: 'error', message: 'Failed to load roles or centers' });
            } finally {
                setLoadingOptions(false);
            }
        };
        fetchOptions();
    }, [open]);

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                role_id: user.role_id || '',
                cc_id: user.cc_id || '',
                status: user.status || 'active',
                password: '',
                password_confirmation: '',
            });
        } else {
            setForm({
                name: '',
                email: '',
                phone: '',
                role_id: '',
                cc_id: '',
                password: '',
                password_confirmation: '',
                status: 'active',
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user && form.password !== form.password_confirmation) {
            showSnackbar({ type: 'error', message: 'Passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            if (user) {
                await update(user.id, {
                    name: form.name,
                    phone: form.phone,
                    status: form.status,
                    role_id: form.role_id,
                    cc_id: form.cc_id || null,
                });
                showSnackbar({ type: 'success', message: 'User updated successfully' });
            } else {
                await create({
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    role_id: form.role_id,
                    cc_id: form.cc_id || null,
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                });
                showSnackbar({ type: 'success', message: 'User created. OTP sent to email.' });
            }
            onClose();
        } catch (err) {
            showSnackbar({
                type: 'error',
                message: err.response?.data?.message || 'Operation failed',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{
                sx: { borderRadius: { xs: 0, sm: 2 } }
            }}
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ pb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    {user ? 'Edit User' : 'Add New User'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Full Name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={!!user}
                            size="small"
                        />
                        <TextField
                            label="Phone"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                        />

                        <TextField
                            select
                            label="Role"
                            name="role_id"
                            value={form.role_id}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={loadingOptions}
                            size="small"
                        >
                            <MenuItem value="">Select Role</MenuItem>
                            {roles.map((role) => (
                                <MenuItem key={role.id} value={role.id}>
                                    {role.display_name || role.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Collection Center"
                            name="cc_id"
                            value={form.cc_id}
                            onChange={handleChange}
                            fullWidth
                            disabled={loadingOptions}
                            helperText="Assign to a collection center (required for transfer requests)"
                            size="small"
                        >
                            <MenuItem value="">None / Unassigned</MenuItem>
                            {collectionCenters.map((cc) => (
                                <MenuItem key={cc.id} value={cc.id}>
                                    {cc.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        {!user && (
                            <>
                                <TextField
                                    label="Password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    size="small"
                                />
                                <TextField
                                    label="Confirm Password"
                                    name="password_confirmation"
                                    type="password"
                                    value={form.password_confirmation}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    size="small"
                                />
                            </>
                        )}

                        {user && (
                            <TextField
                                select
                                label="Status"
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="suspended">Suspended</MenuItem>
                            </TextField>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 2, sm: 3 } }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingOptions}>
                        {loading ? <CircularProgress size={24} /> : (user ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}