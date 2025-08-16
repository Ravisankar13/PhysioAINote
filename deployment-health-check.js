// Simple health check endpoint for deployment verification
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/', (req, res) => {
  res.status(200).send('PhysioGPT Server Running');
});

const port = process.env.PORT || 5000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Health check server running on port ${port}`);
});