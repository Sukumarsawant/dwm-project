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

// GET /api/products?query=SEARCH_TERM
app.get('/api/products', async (req, res) => {
    try {
        const q = req.query.query || '';
        const data = await runPython(['products_search', q]);
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/marketplace?category=CAT&query=Q
app.get('/api/marketplace', async (req, res) => {
    try {
        const cat = req.query.category || 'All';
        const q = req.query.query || '';
        const data = await runPython(['marketplace_catalog', cat, q]);
        res.json({ success: true, products: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/recommend (Pure Apriori Basket Recommendation)
app.post('/api/recommend', async (req, res) => {
    try {
        const payload = JSON.stringify(req.body);
        const data = await runPython(['recommend_basket', payload]);
        res.json({ success: true, recommendations: data });
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
