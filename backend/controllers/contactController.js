const db = require('../db');

exports.submitMessage = async (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, Email, and Message are required fields.' });
    }

    try {
        await db.query(
            'INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)',
            [name, email, subject, message]
        );
        res.json({ message: 'Success! Your message has been sent to our support team.' });
    } catch (err) {
        console.error('Contact Submission Error:', err.message);
        res.status(500).json({ error: 'Failed to deliver message. Please try again later.' });
    }
};

exports.getAllMessages = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch Messages Error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateMessageStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await db.query('UPDATE contact_messages SET status = $1 WHERE id = $2', [status, id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
};

exports.deleteMessage = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM contact_messages WHERE id = $1', [id]);
        res.json({ message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Deletion failed' });
    }
};