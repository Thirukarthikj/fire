let app;
let initError = null;

try {
  app = require('../backend/server');
} catch (err) {
  initError = {
    message: err.message,
    stack: err.stack,
    name: err.name
  };
}

module.exports = (req, res) => {
  if (initError) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Backend Initialization Error',
      details: initError
    });
  }

  try {
    return app(req, res);
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Runtime Error',
      message: err.message,
      stack: err.stack
    });
  }
};
