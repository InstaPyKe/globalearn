const express = require('express');
const router = express.Router();
const pool = require('../db'); // Your database connection pool
const { authenticateToken } = require('../middleware/auth'); // Corrected path to auth middleware

// GET: Fetch available surveys with their questions
router.get('/available', authenticateToken, async (req, res) => {
    try {
        // Fetch all surveys from the database
        const surveysQuery = 'SELECT * FROM surveys';
        const surveysRes = await pool.query(surveysQuery);
        const surveys = surveysRes.rows;

        // Fetch questions for each survey and attach them to the object
        for (let survey of surveys) {
            const questionsQuery = `
                SELECT question_text as text, options, correct_option 
                FROM survey_questions 
                WHERE survey_id = $1
                ORDER BY id ASC -- Ensure questions are in a consistent order
            `;
            const questionsRes = await pool.query(questionsQuery, [survey.id]);
            survey.questions = questionsRes.rows;
        }

        res.json(surveys);
    } catch (err) {
        console.error('Database Error fetching surveys:', err);
        res.status(500).json({ error: 'Failed to retrieve surveys from database' });
    }
});

// POST: Submit survey and credit user account
router.post('/submit', authenticateToken, async (req, res) => {
    const { surveyId, answers } = req.body;
    const userId = req.user.id; // Assuming req.user.id is set by authenticateToken

    if (!surveyId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Invalid survey submission data.' });
    }

    try {
        // Check if user has already completed this survey
        const existingCompletion = await pool.query(
            'SELECT id FROM survey_completions WHERE user_id = $1 AND survey_id = $2',
            [userId, surveyId]
        );
        if (existingCompletion.rows.length > 0) {
            return res.status(409).json({ error: 'You have already completed this survey.' });
        }

        await pool.query('BEGIN'); // Start transaction

        // 1. Fetch correct answers for validation
        const questionsQuery = 'SELECT correct_option FROM survey_questions WHERE survey_id = $1 ORDER BY id ASC';
        const questionsRes = await pool.query(questionsQuery, [surveyId]);

        if (answers.length !== questionsRes.rows.length) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Incomplete survey submission.' });
        }

        const correctAnswers = questionsRes.rows.map(q => q.correct_option);

        // 2. Validate user answers
        const isCorrect = answers.every((val, index) => val === correctAnswers[index]);
        if (!isCorrect) {
            return res.status(400).json({ error: 'Incorrect answers detected. No reward granted.' });
        }

        // 3. Get the reward amount
        const rewardRes = await pool.query('SELECT reward FROM surveys WHERE id = $1', [surveyId]);
        if (rewardRes.rows.length === 0) throw new Error('Survey not found');
        const reward = rewardRes.rows[0].reward;
        const surveyTitle = rewardRes.rows[0].title;

        // 4. Record the completion
        await pool.query(
            'INSERT INTO survey_completions (user_id, survey_id, answers) VALUES ($1, $2, $3)',
            [userId, surveyId, JSON.stringify(answers)]
        );

        // 5. Update User Balance
        await pool.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [reward, userId]
        );

        // 6. Log transaction for history (Dashboard/Wallet visibility)
        const refId = `SRV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, method, reference_id) 
             VALUES ($1, 'survey_reward', $2, 'completed', $3, $4)`,
            [userId, reward, `Survey: ${surveyTitle}`, refId]
        );

        await pool.query('COMMIT'); // Commit transaction
        res.json({ success: true, message: `Reward of KSH ${reward} credited!` });
    } catch (err) {
        await pool.query('ROLLBACK'); // Rollback on error
        console.error('Submission Error:', err);
        res.status(500).json({ error: 'Failed to process survey submission' });
    }
});

module.exports = router;