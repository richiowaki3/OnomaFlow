const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8082;

app.use(express.json());
app.use(express.static('public'));

let systemPrompt = "";
const promptPath = path.join(__dirname, 'onomatopoeia_prompt.txt');

// Load prompt if exists
if (fs.existsSync(promptPath)) {
    systemPrompt = fs.readFileSync(promptPath, 'utf8');
    console.log("Onomatopoeia Prompt Loaded.");
}

// Endpoint for word analysis
app.post('/analyze', async (req, res) => {
    const { word } = req.body;
    console.log(`Analyzing: ${word}`);

    // Mock Database for quick response
    const mockDb = {
        "あたふた": [2, 8, 3, 6, 7, 3, 440, 7, 4500, 2, 5, "#FFD700"],
        "あっ": [6, 9, 9, 8, 2, 1, 350, 9, 8000, 9, 8, "#FF0000"],
        "あはは": [1, 5, 2, 0, 9, 6, 480, 2, 500, 1, 9, "#FFFF00"],
        "むりむり": [7, 3, 2, 8, 5, 4, 180, 5, 800, 7, 3, "#483D8B"],
        "ももも": [3, 2, 1, 4, 3, 8, 120, 2, 300, 5, 2, "#9370DB"]
    };

    if (mockDb[word]) {
        return res.json({ vector: mockDb[word] });
    }

    // Dynamic Mock (Pseudo-AI for word generation)
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const mockVec = [
        rand(1, 9), rand(1, 9), rand(1, 9), rand(1, 9), // Category A
        rand(1, 9), rand(1, 4), rand(100, 1500), rand(0, 9), // Category B
        rand(0, 10000), rand(0, 6), rand(0, 9), // Category C
        `#${Math.floor(Math.random()*16777215).toString(16)}` 
    ];
    
    res.json({ vector: mockVec });
});

app.listen(PORT, () => {
    console.log(`Matrix Server running at http://localhost:${PORT}`);
});
