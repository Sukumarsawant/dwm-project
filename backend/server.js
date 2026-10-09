const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const SCRIPT_PATH = path.join(__dirname, 'predict_service.py');

// Helper to run python script
function runPython(args) {
    return new Promise((resolve, reject) => {
        const pyProcess = spawn(PYTHON_PATH, [SCRIPT_PATH, ...args]);
        let output = '';
        let errorOutput = '';

        pyProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pyProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pyProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
            }
            try {
                const parsed = JSON.parse(output.trim());
                resolve(parsed);
            } catch (err) {
                reject(new Error(`JSON Parse Error: ${err.message}. Output was: ${output}`));
            }
        });
    });
}

// GET /api/analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const data = await runPython(['analytics']);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/customers
app.get('/api/customers', async (req, res) => {
    try {
        const data = await runPython(['customers']);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/customers/:id
app.get('/api/customers/:id', async (req, res) => {
    try {
        const data = await runPython(['customer_detail', req.params.id]);
        if (data.error) {
            return res.status(404).json({ success: false, error: data.error });
        }
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/customers/:id/recommendations
app.get('/api/customers/:id/recommendations', async (req, res) => {
    try {
        const data = await runPython(['recommendations', req.params.id]);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/rules
app.get('/api/rules', async (req, res) => {
    try {
        const data = await runPython(['rules']);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

