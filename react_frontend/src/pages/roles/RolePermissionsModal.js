// src/pages/roles/RolePermissionsModal.js
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, CircularProgress, Checkbox, FormControlLabel,
    Typography, Divider, TextField, InputAdornment,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Search as SearchIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { roleService } from 'services/role.service';
import { permissionService } from 'services/permission.service';
import { showSnackbar } from 'utils/snackbar';

// Helper: extract group name from permission name (e.g., "agent.sale.create" → "agent")
const getGroupName = (permName) => {
    const parts = permName.split(/[._-]/); // split by dot, underscore or dash
    return parts[0] || 'other';
};

// Group permissions by the extracted group name
const groupPermissions = (permissions) => {
    const groups = {};
    permissions.forEach(perm => {
        const group = getGroupName(perm.name);
        if (!groups[group]) groups[group] = [];
        groups[group].push(perm);
    });
    // Sort groups alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
    }, {});
};

export default function RolePermissionsModal({ open, onClose, role }) {
    const [loading, setLoading] = useState(false);
    const [allPermissions, setAllPermissions] = useState([]);      // raw permissions from API
    const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open && role) {
            loadData();
        }
    }, [open, role]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load all permissions
            const permRes = await permissionService.getPermissions({ per_page: 1000 });
            const all = permRes.data?.success ? permRes.data.data.data : [];
            setAllPermissions(all);

            // Load role's current permissions
            const rolePermRes = await roleService.getRolePermissions(role.id);
            const current = rolePermRes.data?.success ? rolePermRes.data.data : [];
            const currentIds = current.map(p => p.id);
            setSelectedPermissionIds(currentIds);
        } catch (err) {
            console.error(err);
            showSnackbar({ type: 'error', message: 'Failed to load permissions' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (permId) => {
        setSelectedPermissionIds(prev =>
            prev.includes(permId)
                ? prev.filter(id => id !== permId)
                : [...prev, permId]
        );
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await roleService.syncRolePermissions(role.id, selectedPermissionIds);
            showSnackbar({ type: 'success', message: 'Permissions updated' });
            onClose();
        } catch (err) {
            showSnackbar({ type: 'error', message: 'Failed to sync permissions' });
        } finally {
            setLoading(false);
        }
    };

    // Filter permissions based on search (by name or display_name)
    const filteredPermissions = allPermissions.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.display_name.toLowerCase().includes(search.toLowerCase())
    );

    // Group filtered permissions
    const groupedPermissions = groupPermissions(filteredPermissions);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Manage Permissions for "{role?.display_name || role?.name}"
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        label="Search permissions"
                        size="small"
                        fullWidth
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{ maxHeight: 500, overflowY: 'auto' }}>
                        {Object.keys(groupedPermissions).length === 0 ? (
                            <Typography>No permissions found</Typography>
                        ) : (
                            Object.entries(groupedPermissions).map(([groupName, perms]) => (
                                <Accordion key={groupName} defaultExpanded>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                            {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                                            <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                                                ({perms.length})
                                            </Typography>
                                        </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', ml: 2 }}>
                                            {perms.map((perm) => (
                                                <FormControlLabel
                                                    key={perm.id}
                                                    control={
                                                        <Checkbox
                                                            checked={selectedPermissionIds.includes(perm.id)}
                                                            onChange={() => handleToggle(perm.id)}
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2">
                                                                {perm.display_name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {perm.name}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    sx={{ mb: 0.5, alignItems: 'flex-start' }}
                                                />
                                            ))}
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ))
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
}