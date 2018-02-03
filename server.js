require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
// const jwt = require('jsonwebtoken');
const environment = process.env.NODE_ENV || 'development';
// const configuration = require('./knexfile')[environment];
// const database = require('knex')(configuration);

const app = express();
const bodyParser = require('body-parser');

const requireHTTPS = (request, response, next) => {
  if (request.header('x-forwarded-proto') !== 'https') {
    return response.redirect(`https://${request.header('host')}${request.url}`);
  }
  next();
};
if (process.env.NODE_ENV === 'production') { app.use(requireHTTPS); }

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use((request, response, next)=>{
  response.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.set('port', process.env.PORT || 4000);

app.locals.title = 'statify-backend';

app.get('/login', (request, response) => {
  return response.status(200).redirect(`https://accounts.spotify.com/authorize/?client_id=${process.env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F&scope=user-read-private%20user-read-email%20user-top-read%20playlist-modify-public%20playlist-modify-private%20user-read-recently-played&state=34fFs29kd09`)
})

app.post('/top-songs', (request, response) => {
  const authCode = request.body.authCode;
  const formData = {
    'grant_type': 'authorization_code',
    'code': authCode,
    'redirect_uri': 'http://localhost:3000/',
    'client_id': process.env.SPOTIFY_CLIENT_ID,
    'client_secret': process.env.SPOTIFY_SECRET_ID,
  };
  let formBody = [];
  for (let property in formData) {
    let encodedKey = encodeURIComponent(property);
    let encodedValue = encodeURIComponent(formData[property]);
    formBody.push(encodedKey + '=' + encodedValue);
}
  formBody = formBody.join('&');
  fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formBody
  }).then(res => res.json())
  .then(jsonRes => response.status(200).json({ body: jsonRes }))
  .catch(error => response.status(500).json({ error }));
})

app.listen(app.get('port'), () => {
  // eslint-disable-next-line no-console
  console.log(`${app.locals.title} is running on ${app.get('port')}.`);
});

module.exports = app;
