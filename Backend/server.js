const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = 3602;

// PostgreSQL connection configuration
const pool = new Pool({
    user: 'postgres',
    host: 'postgres',
    database: 'asset_management',
    password: 'admin123',
    port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files (your HTML, CSS, JS)

// Utility function for date validation
function validateDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoMonthsLater = new Date(today);
    twoMonthsLater.setMonth(today.getMonth() + 2);
    return date >= today && date <= twoMonthsLater;
}

// Employee Endpoints
// Submit new asset request
app.post('/api/requests', async (req, res) => {
    const { employeeName, employeeID, assetType, otherAssetName, reason, requestDate } = req.body;

    // Input validation
    if (!employeeName || employeeName.trim().length < 5 || employeeName.trim().length > 40) {
        return res.status(400).json({ error: 'Employee name must be between 5 and 40 characters' });
    }

    if (!/^ATS0\d{3}$/.test(employeeID) || employeeID.endsWith('000')) {
        return res.status(400).json({ error: 'Invalid employee ID format' });
    }

    if (!assetType) {
        return res.status(400).json({ error: 'Asset type is required' });
    }

    if (assetType === 'Other' && (!otherAssetName || !/^[A-Za-z\s]+$/.test(otherAssetName) || otherAssetName.trim().length < 3 || otherAssetName.trim().length > 30)) {
        return res.status(400).json({ error: 'Invalid other asset name' });
    }

    if (!reason || reason.trim().length < 5 || reason.trim().length > 300) {
        return res.status(400).json({ error: 'Reason must be between 5 and 300 characters' });
    }

    if (!validateDate(requestDate)) {
        return res.status(400).json({ error: 'Invalid request date' });
    }

    try {
        // Check for duplicate requests
        const duplicateCheck = await pool.query(
            'SELECT * FROM asset_requests WHERE employee_id = $1 AND asset_type = $2 AND ($3::text IS NULL OR other_asset_name = $3)',
            [employeeID, assetType, assetType === 'Other' ? otherAssetName : null]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: `Duplicate request for ${assetType === 'Other' ? otherAssetName : assetType}` });
        }

        // Insert new request
        const result = await pool.query(
            'INSERT INTO asset_requests (employee_name, employee_id, asset_type, other_asset_name, reason, request_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [employeeName.trim(), employeeID, assetType, assetType === 'Other' ? otherAssetName.trim() : null, reason.trim(), requestDate, 'Pending']
        );

        res.status(201).json({ message: 'Request submitted successfully', request: result.rows[0] });
    } catch (error) {
        console.error('Error submitting request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// HR Endpoints
// Get all requests with optional filtering
app.get('/api/requests', async (req, res) => {
    const { status, search } = req.query;
    let query = 'SELECT * FROM asset_requests';
    const queryParams = [];

    if (status && status !== 'all') {
        query += ' WHERE status = $1';
        queryParams.push(status);
    }

    if (search) {
        query += queryParams.length ? ' AND' : ' WHERE';
        query += ` employee_name ILIKE $${queryParams.length + 1}`;
        queryParams.push(`%${search}%`);
    }

    try {
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update request status
app.put('/api/requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const result = await pool.query(
            'UPDATE asset_requests SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json({ message: `Request ${status.toLowerCase()} successfully`, request: result.rows[0] });
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete selected requests
app.delete('/api/requests', async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No request IDs provided' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM asset_requests WHERE id = ANY($1) RETURNING *',
            [ids]
        );

        res.json({ message: `${result.rowCount} request(s) deleted successfully` });
    } catch (error) {
        console.error('Error deleting requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear all requests
app.delete('/api/requests/clear', async (req, res) => {
    try {
        await pool.query('DELETE FROM asset_requests');
        res.json({ message: 'All requests cleared successfully' });
    } catch (error) {
        console.error('Error clearing requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://13.61.27.190:${port}`);
});