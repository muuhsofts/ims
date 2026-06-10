import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, CircularProgress
} from '@mui/material';
import { permissionService } from 'services/permission.service';
import { showSnackbar } from 'utils/snackbar';

export default function PermissionFormModal({ open, onClose, permission }) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        display_name: '',
        description: '',
        guard_name: 'api',
    });

    useEffect(() => {
        if (permission) {
            setForm({
                name: permission.name || '',
                display_name: permission.display_name || '',
                description: permission.description || '',
                guard_name: permission.guard_name || 'api',
            });
        } else {
            setForm({
                name: '',
                display_name: '',
                description: '',
                guard_name: 'api',
            });
        }
    }, [permission]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (permission) {
                await permissionService.updatePermission(permission.id, form);
                showSnackbar({ type: 'success', message: 'Permission updated successfully' });
            } else {
                await permissionService.createPermission(form);
                showSnackbar({ type: 'success', message: 'Permission created successfully' });
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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>{permission ? 'Edit Permission' : 'Add New Permission'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Permission Name (key)"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            helperText="Unique identifier, e.g. 'users.view'"
                        />
                        <TextField
                            label="Display Name"
                            name="display_name"
                            value={form.display_name}
                            onChange={handleChange}
                            required
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            multiline
                            rows={2}
                            fullWidth
                        />
                        <TextField
                            label="Guard Name"
                            name="guard_name"
                            value={form.guard_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            helperText="Usually 'api' or 'web'"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : (permission ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}