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
    Alert,
    Collapse,
} from '@mui/material';
import { useUsers } from 'context/UserContext';
import { roleService } from 'services/role.service';
import { showSnackbar } from 'utils/snackbar';

const PASSWORD_MIN_LENGTH = 8;

// Map backend field names → form field names
const mapFieldKey = (key) => {
    const mapping = {
        name: 'name',
        email: 'email',
        phone: 'phone',
        role_id: 'role_id',
        password: 'password',
        status: 'status',
    };
    return mapping[key] || key;
};

export default function UserFormModal({ open, onClose, user }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useUsers();
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        role_id: '',
        password: '',
        password_confirmation: '',
        status: 'active',
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [errorList, setErrorList] = useState([]);

    // Load roles when modal opens
    useEffect(() => {
        if (!open) return;
        const fetchRoles = async () => {
            setLoadingOptions(true);
            try {
                const rolesRes = await roleService.getRolesDropdown();
                setRoles(
                    rolesRes.data?.success && Array.isArray(rolesRes.data.data)
                        ? rolesRes.data.data
                        : []
                );
            } catch {
                showSnackbar({ type: 'error', message: 'Failed to load roles' });
            } finally {
                setLoadingOptions(false);
            }
        };
        fetchRoles();
    }, [open]);

    // Populate or reset form when user/open changes
    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                role_id: user.role_id || '',
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
                password: '',
                password_confirmation: '',
                status: 'active',
            });
        }
        setFieldErrors({});
        setErrorList([]);
    }, [user, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Clear this field's error and rebuild the banner list
        setFieldErrors((prev) => {
            const next = { ...prev, [name]: '' };
            setErrorList(Object.values(next).filter(Boolean));
            return next;
        });
    };

    /**
     * Set field errors, update the banner, and fire a toast.
     * Single error → toast the message directly.
     * Multiple errors → toast a count, banner lists all.
     */
    const applyErrors = (errors) => {
        setFieldErrors(errors);
        const messages = Object.values(errors).filter(Boolean);
        setErrorList(messages);
        if (messages.length === 1) {
            showSnackbar({ type: 'error', message: messages[0] });
        } else if (messages.length > 1) {
            showSnackbar({
                type: 'error',
                message: `${messages.length} issues found — please review the form`,
            });
        }
    };

    /**
     * Guard against axios setups that resolve (don't throw) on 4xx.
     * If the adapter returns { success: false }, synthesise an error
     * so the catch block always handles failures uniformly.
     */
    const handleServiceResult = (result) => {
        if (result && result.success === false) {
            const err = new Error(result.message || 'Operation failed');
            err.__serviceError = true;
            err.errors = result.errors || {};
            err.message = result.message || 'Operation failed';
            throw err;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- Client-side validation — collect ALL errors before bailing ---
        if (!user) {
            const clientErrors = {};

            if (!form.name.trim()) {
                clientErrors.name = 'Full name is required';
            }
            if (!form.email.trim()) {
                clientErrors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                clientErrors.email = 'Enter a valid email address';
            }
            if (!form.role_id) {
                clientErrors.role_id = 'Role is required';
            }
            if (!form.password) {
                clientErrors.password = 'Password is required';
            } else if (form.password.length < PASSWORD_MIN_LENGTH) {
                clientErrors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
            }
            if (!form.password_confirmation) {
                clientErrors.password_confirmation = 'Please confirm your password';
            } else if (form.password && form.password !== form.password_confirmation) {
                clientErrors.password_confirmation = 'Passwords do not match';
            }

            if (Object.keys(clientErrors).length > 0) {
                applyErrors(clientErrors);
                return;
            }
        }

        setFieldErrors({});
        setErrorList([]);
        setLoading(true);

        try {
            if (user) {
                // ✅ cc_id removed - not sent in update
                const result = await update(user.id, {
                    name: form.name,
                    phone: form.phone,
                    status: form.status,
                    role_id: form.role_id,
                });
                handleServiceResult(result);
                showSnackbar({ type: 'success', message: 'User updated successfully' });
                onClose();
            } else {
                // ✅ cc_id removed - not sent in create
                const result = await create({
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    role_id: form.role_id,
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                });
                handleServiceResult(result);
                showSnackbar({ type: 'success', message: 'User created. OTP sent to email.' });
                onClose();
            }
        } catch (err) {
            // Synthetic error from handleServiceResult ({ success: false } response)
            if (err.__serviceError) {
                const { errors, message } = err;
                if (errors && Object.keys(errors).length > 0) {
                    const newFieldErrors = {};
                    Object.keys(errors).forEach((key) => {
                        newFieldErrors[mapFieldKey(key)] = Array.isArray(errors[key])
                            ? errors[key][0]
                            : errors[key];
                    });
                    applyErrors(newFieldErrors);
                } else {
                    setErrorList([message]);
                    showSnackbar({ type: 'error', message });
                }
                return;
            }

            // Laravel 422 validation error (axios throws on non-2xx)
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const backendErrors = err.response.data.errors;
                const newFieldErrors = {};
                Object.keys(backendErrors).forEach((key) => {
                    newFieldErrors[mapFieldKey(key)] = backendErrors[key][0];
                });
                applyErrors(newFieldErrors);
            } else {
                // General / network error
                const message =
                    err.response?.data?.message || err.message || 'Operation failed';
                setErrorList([message]);
                showSnackbar({ type: 'error', message });
            }
        } finally {
            setLoading(false);
        }
    };

    const hasErrors = errorList.length > 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{ sx: { borderRadius: { xs: 0, sm: 2 } } }}
        >
            <form onSubmit={handleSubmit} noValidate>
                <DialogTitle sx={{ pb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    {user ? 'Edit User' : 'Add New User'}
                </DialogTitle>

                <DialogContent>
                    {/* ── Error summary banner ── */}
                    <Collapse in={hasErrors}>
                        <Alert
                            severity="error"
                            sx={{ mb: 2, mt: 1 }}
                            onClose={() => setErrorList([])}
                        >
                            {errorList.length === 1 ? (
                                errorList[0]
                            ) : (
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                    {errorList.map((msg, i) => (
                                        <li key={i}>{msg}</li>
                                    ))}
                                </Box>
                            )}
                        </Alert>
                    </Collapse>

                    <Box display="flex" flexDirection="column" gap={2} mt={hasErrors ? 0 : 1}>
                        <TextField
                            label="Full Name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                            autoFocus
                            error={!!fieldErrors.name}
                            helperText={fieldErrors.name}
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
                            error={!!fieldErrors.email}
                            helperText={fieldErrors.email || (user ? 'Email cannot be changed' : '')}
                        />

                        <TextField
                            label="Phone"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            error={!!fieldErrors.phone}
                            helperText={fieldErrors.phone}
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
                            error={!!fieldErrors.role_id}
                            helperText={fieldErrors.role_id}
                        >
                            <MenuItem value="">Select Role</MenuItem>
                            {roles.map((role) => (
                                <MenuItem key={role.id} value={role.id}>
                                    {role.display_name || role.name}
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
                                    error={!!fieldErrors.password}
                                    helperText={
                                        fieldErrors.password ||
                                        `Minimum ${PASSWORD_MIN_LENGTH} characters`
                                    }
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
                                    error={!!fieldErrors.password_confirmation}
                                    helperText={fieldErrors.password_confirmation}
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
                                error={!!fieldErrors.status}
                                helperText={fieldErrors.status}
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
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || loadingOptions}>
                        {loading ? <CircularProgress size={24} /> : user ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}