// src/pages/agents/AgentFormModal.js
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
    Typography,
} from '@mui/material';
import { useAgents } from 'context/AgentContext';
import { collectionCenterService } from 'services/collection-center.service';
import { showSnackbar } from 'utils/snackbar';

// Map backend field names to our form field names
const mapFieldKey = (key) => {
    const mapping = {
        email: 'email',
        name: 'name',
        phone: 'phone',
        cc_id: 'cc_id',
        status: 'status',
    };
    return mapping[key] || key;
};

export default function AgentFormModal({ open, onClose, agent }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const { create, update } = useAgents();
    const [loading, setLoading] = useState(false);
    const [collectionCenters, setCollectionCenters] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        cc_id: '',
        status: 'active',
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [errorList, setErrorList] = useState([]);

    // Load collection centers when modal opens
    useEffect(() => {
        if (!open) return;
        const fetchOptions = async () => {
            setLoadingOptions(true);
            try {
                const centersRes = await collectionCenterService.getCentersDropdown();
                if (centersRes.data?.success && Array.isArray(centersRes.data.data)) {
                    setCollectionCenters(centersRes.data.data);
                } else {
                    setCollectionCenters([]);
                }
            } catch {
                showSnackbar({ type: 'error', message: 'Failed to load collection centers' });
            } finally {
                setLoadingOptions(false);
            }
        };
        fetchOptions();
    }, [open]);

    // Populate form when editing
    useEffect(() => {
        if (agent) {
            setForm({
                name: agent.name || '',
                email: agent.email || '',
                phone: agent.phone || '',
                cc_id: agent.cc_id || '',
                status: agent.status || 'active',
            });
        } else {
            setForm({
                name: '',
                email: '',
                phone: '',
                cc_id: '',
                status: 'active',
            });
            setGeneratedPassword('');
        }
        setFieldErrors({});
        setErrorList([]);
    }, [agent, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setFieldErrors((prev) => {
            const next = { ...prev, [name]: '' };
            setErrorList(Object.values(next).filter(Boolean));
            return next;
        });
    };

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

        // Client-side validation (no password validation needed anymore)
        if (!agent) {
            const clientErrors = {};

            if (!form.name.trim()) {
                clientErrors.name = 'Full name is required';
            }
            if (!form.email.trim()) {
                clientErrors.email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                clientErrors.email = 'Enter a valid email address';
            }

            if (Object.keys(clientErrors).length > 0) {
                applyErrors(clientErrors);
                return;
            }
        }

        setFieldErrors({});
        setErrorList([]);
        setLoading(true);
        setGeneratedPassword('');

        try {
            if (agent) {
                const result = await update(agent.id, {
                    name: form.name,
                    phone: form.phone,
                    status: form.status,
                    cc_id: form.cc_id || null,
                });
                handleServiceResult(result);
                showSnackbar({ type: 'success', message: 'Agent updated successfully' });
                onClose();
            } else {
                const result = await create({
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    cc_id: form.cc_id || null,
                });
                handleServiceResult(result);

                // ✅ FIX: Properly extract the generated password from the response
                // The response structure is: { success: true, message: "...", data: { ... } }
                const responseData = result?.data?.data || result?.data || result;
                const password = responseData?.generated_password;

                if (password) {
                    setGeneratedPassword(password);
                    showSnackbar({
                        type: 'success',
                        message: `Agent created successfully! Default password: ${password}`
                    });
                } else {
                    showSnackbar({ type: 'success', message: 'Agent created. OTP sent to email.' });
                }
                onClose();
            }
        } catch (err) {
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

            if (err.response?.status === 422 && err.response?.data?.errors) {
                const backendErrors = err.response.data.errors;
                const newFieldErrors = {};
                Object.keys(backendErrors).forEach((key) => {
                    newFieldErrors[mapFieldKey(key)] = backendErrors[key][0];
                });
                applyErrors(newFieldErrors);
            } else {
                const message = err.response?.data?.message || err.message || 'Operation failed';
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
                    {agent ? 'Edit Sales Agent' : 'Add Sales Agent'}
                </DialogTitle>

                <DialogContent>
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

                    {/* ✅ Display generated password when available */}
                    {generatedPassword && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                <strong>Default Password:</strong> {generatedPassword}
                                <br />
                                <em>Please share this password with the agent.</em>
                            </Typography>
                        </Alert>
                    )}

                    <Box display="flex" flexDirection="column" gap={2} mt={hasErrors ? 0 : 1}>
                        <TextField
                            label="Full Name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            size="small"
                            error={!!fieldErrors.name}
                            helperText={fieldErrors.name}
                            autoFocus
                        />

                        <TextField
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={!!agent}
                            size="small"
                            error={!!fieldErrors.email}
                            helperText={fieldErrors.email || (agent ? 'Email cannot be changed' : '')}
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
                            label="Collection Center"
                            name="cc_id"
                            value={form.cc_id}
                            onChange={handleChange}
                            fullWidth
                            disabled={loadingOptions}
                            helperText={fieldErrors.cc_id || 'Assign to a collection center (recommended)'}
                            error={!!fieldErrors.cc_id}
                            size="small"
                        >
                            <MenuItem value="">None / Unassigned</MenuItem>
                            {collectionCenters.map((cc) => (
                                <MenuItem key={cc.id} value={cc.id}>
                                    {cc.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        {agent && (
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
                        {loading ? <CircularProgress size={24} /> : agent ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}