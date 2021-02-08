const express = require('express');
const app = express();
const apiRules = require('./CRUD/rules');
const apiConfig = require('./CRUD/config');
// const apiDeployInLocalFS = require('./deployment/deployInLocalFS'); // TODO: only if we will support local filesystem access
const apiDeployAS = require('./deployment/deployAS');
const bodyParser = require('body-parser');

// https://stackoverflow.com/questions/52016659/nodejs-router-payload-too-large
const limit = '50Mb';
const extended = true;
const options = { limit, extended };
app.use(bodyParser.json(options));
app.use(bodyParser.urlencoded(options));
app.use(bodyParser.text(options));
app.use(apiRules);
app.use(apiConfig);
// app.use(apiDeployInLocalFS); // TODO: only if we will support local filesystem access
app.use(apiDeployAS);

module.exports = app;
