const express = require('express');
const router = express.Router();

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
  showTablesWithDescribe
} = require('./controller/restapi');

const { 
  testConnection,
  describeTable
 } = require('./controller/testconnection');

// ENDPOINTS
router.get('/get', getAllEndpoints);
router.post('/post', addEndpoint);
router.put('/put/:id', updateEndpoint);
router.delete('/delete/:id', deleteEndpoint);


// DOMAINS
router.get('/domain/get', getAllDomains);
router.post('/domain/post', addDomain);

// REST API DOC TEST
router.get('/restapi/get',getAllRestApis);
router.post('/restapi/post',createRestApi);
router.delete('/restapi/delete/:id',deleteRestApi);
router.get('/restapi/:uuid', showTablesWithDescribe);


// TEST CONNECTION
router.post('/testconn', testConnection);
router.post('/describe', describeTable);

module.exports = router;