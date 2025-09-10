const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

const PORT = 5000;

const routes = require('./routes');

app.use(cors());
app.use(bodyParser.json());

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Server berjalan');
});


app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
