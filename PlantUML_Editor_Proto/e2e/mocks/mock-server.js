/**
 * Mock API Server for E2E Testing
 * Sprint2 Foundation Implementation
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/convert', (req, res) => {
  const { input } = req.body;
  const mockOutput = `@startuml\n${input}\nA -> B: ${input}\n@enduml`;
  res.json({ success: true, result: mockOutput });
});

app.get('/api/mock-data', (req, res) => {
  res.json({
    testData: 'Mock response for testing',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
});

export default app;