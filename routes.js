// routes.js (CommonJS version)

const express = require('express');

const {
  getAllEndpoints,
  addEndpoint,
  updateEndpoint,
  deleteEndpoint
} = require('./controller/endpoints');

const {
  getAllDomains,
  addDomain
} = require('./controller/domains');

const {
  createRestApi,
  getAllRestApis,
  deleteRestApi,
  showTablesWithDescribe,
  generateOneEndpointFromDb,
  // previewTables,
  getDataFromOneTable
} = require('./controller/restapi');

const {
  testConnection,
  describeTable
} = require('./controller/testconnection');

const {
  callByIdAndPath,
  callByUuidAndPath,
} = require('./controller/publicapi');

const router = express.Router();

// ==========================
// ENDPOINTS (Management)
// ==========================
router.get('/get', getAllEndpoints);
router.post('/post', addEndpoint);
router.put('/put/:id', updateEndpoint);
router.delete('/delete/:id', deleteEndpoint);

// ==========================
// DOMAINS (Management)
// ==========================
router.get('/domain/get', getAllDomains);
router.post('/domain/post', addDomain);

// ==========================
// REST API Config (Database connection)
// ==========================
router.get('/restapi/get', getAllRestApis);
router.post('/restapi/post', createRestApi);
router.delete('/restapi/delete/:id', deleteRestApi);
router.get('/restapi/:uuid', showTablesWithDescribe);
router.post('/restapi/generateone/:uuid', generateOneEndpointFromDb);
// router.get('/restapi/preview/:uuid', previewTables);
router.get('/restapi/:uuid/:tableName', getDataFromOneTable);


// ==========================
// DATABASE Tools
// ==========================
router.post('/testconn', testConnection);
router.post('/describe', describeTable);

// ==========================
// PUBLIC API (Catch-all)
// ==========================
router.get('/call/:id/:path', callByIdAndPath);
router.get('/uuid/:uuid/:path', callByUuidAndPath);

module.exports = router;
