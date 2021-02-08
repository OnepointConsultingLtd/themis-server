const express = require('express');
const app = express();
const api = require('./api/index');

app.set('port', (process.env.PORT || 5000));
app.use('/api', api);
app.get('/', (request, response) => {
  const result = 'Themis server is running'
  response.send(result);
}).listen(app.get('port'), () => {
  console.log('Themis server is running and listening on port ', app.get('port'));
});
