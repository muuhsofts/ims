// src/pages/roles/RoleFormModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress, useMediaQuery, useTheme
} from '@mui/material';
import { roleService } from 'services/role.service';
import { showSnackbar } from 'utils/snackbar';

export default function RoleFormModal({ open, onClose, role }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        display_name: '',
        description: '',
        guard_name: 'api',
    });

    useEffect(() => {
        if (role) {
            setForm({
                name: role.name || '',
                display_name: role.display_name || '',
                description: role.description || '',
                guard_name: role.guard_name || 'api',
            });
        } else {
            setForm({
                name: '',
                display_name: '',
                description: '',
                guard_name: 'api',
            });
        }
    }, [role]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (role) {
                await roleService.updateRole(role.id, form);
                showSnackbar({ type: 'success', message: 'Role updated successfully' });
            } else {
                await roleService.createRole(form);
                showSnackbar({ type: 'success', message: 'Role created successfully' });
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
                    {role ? 'Edit Role' : 'Add New Role'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Role Name (key)"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            helperText="Unique identifier, uppercase e.g. 'ADMINISTRATOR'"
                            size="small"
                        />
                        <TextField
                            label="Display Name"
                            name="display_name"
                            value={form.display_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Description"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            multiline
                            rows={2}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Guard Name"
                            name="guard_name"
                            value={form.guard_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            helperText="Usually 'api' or 'web'"
                            size="small"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 0 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : (role ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}