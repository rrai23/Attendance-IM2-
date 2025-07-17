const express = require('express');
const attendanceRoutes = require('./backend/routes/attendance');

// Create a test app to inspect routes
const app = express();
app.use('/api/attendance', attendanceRoutes);

console.log('Available routes:');
app._router.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${Object.keys(layer.route.methods)} ${layer.route.path}`);
  } else if (layer.regexp && layer.handle && layer.handle.stack) {
    console.log(`Router: ${layer.regexp}`);
    layer.handle.stack.forEach((stackLayer) => {
      if (stackLayer.route) {
        console.log(`  ${Object.keys(stackLayer.route.methods)} ${stackLayer.route.path}`);
      }
    });
  }
});
