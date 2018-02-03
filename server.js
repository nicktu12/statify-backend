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

// helper functions
const cleanStringArray = (array) => array.join(', ');

const cleanSongArtist = (array) => {
  return cleanStringArray(array.map(artist => artist.name));
};

const cleanArtistRes = (json)  => {
  return json.items.map(item => 
    Object.assign({}, {
      name: item.name, 
      photo: item.images[0], 
      followers: item.followers.total.toLocaleString(), 
      popularity: item.popularity,
      genres: cleanStringArray(item.genres)
    })  
  );
};

const cleanUserRes = (json) => {
  return Object.assign(
    {}, 
    {
      name: json.display_name, 
      email: json.email, 
      image: json.images[0].url,
      id: json.id,
      followers: json.followers.total,
      plan: json.product,
    },
  );
};

const recentlyPlayedCleaner = (json) => {
  return json.items.map(song =>
    Object.assign({}, {
      title: song.track.name,
      artists: cleanSongArtist(song.track.artists)
    },
    )
  );
};

// start auth code flow
app.get('/login', (request, response) => {
  return response.status(200).redirect(`https://accounts.spotify.com/authorize/?client_id=${process.env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F&scope=user-read-private%20user-read-email%20user-top-read%20playlist-modify-public%20playlist-modify-private%20user-read-recently-played&state=34fFs29kd09`)
})

// get auth code, user info, top songs and recently played
app.post('/top-songs', (request, response) => {
  const authCode = request.body.authCode;
  // this will be response body
  const body = {};
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
  // retrieve access token
  fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formBody
  }).then(res => res.json())
  .then(res => {
    // copy access token to response body
    Object.assign(body, { access_token: res.access_token });
    // retrieve user info
    fetch ('https://api.spotify.com/v1/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${body.access_token}`
      }
    }).then(res => res.json())
    .then(res => {
      // copy user info to response body
      Object.assign(body, { userInfo: cleanUserRes(res) });
      // retrieve top artists
      fetch(`https://api.spotify.com/v1/me/top/artists?limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${body.access_token}`
        }
      }).then(res => res.json())
      .then(res => {
        // copy top artists to response body
        Object.assign(body, { topArtists: cleanArtistRes(res) });
        // retrieve recently played songs
        fetch(`https://api.spotify.com/v1/me/player/recently-played`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${body.access_token}`
          }
        }).then(res => res.json())
        .then(res => {
          // copy recently played to response body
          Object.assign(body, { recentlyPlayed: recentlyPlayedCleaner(res) });
        })
        // send response
        .then(res => response.status(200).json({ body }))
        .catch(error => response.status(500).json({ error }))
      })
      .catch(error => response.status(500).json({ error }));
    })
    .catch(error => response.status(500).json({ error }));
  })
 .catch(error => response.status(500).json({ error }));
})

app.listen(app.get('port'), () => {
  // eslint-disable-next-line no-console
  console.log(`${app.locals.title} is running on ${app.get('port')}.`);
});

module.exports = app;
