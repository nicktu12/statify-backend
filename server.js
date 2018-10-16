/* eslint-disable quote-props, no-shadow */
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
// const jwt = require('jsonwebtoken');
// eslint-disable-next-line no-unused-vars
const environment = process.env.NODE_ENV || 'development';
// const configuration = require('./knexfile')[environment];
// const database = require('knex')(configuration);

const app = express();
const bodyParser = require('body-parser');

// eslint-disable-next-line consistent-return
const requireHTTPS = (request, response, next) => {
  if (request.header('x-forwarded-proto') !== 'https') {
    return response.redirect(`https://${request.header('host')}${request.url}`);
  }
  next();
};

if (process.env.NODE_ENV === 'production') { app.use(requireHTTPS); }

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(`${__dirname}/public`));
app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', 'https://statify12.herokuapp.com');
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.set('port', process.env.PORT || 4000);

app.locals.title = 'statify-backend';

// helper functions
const cleanStringArray = array => array.join(', ');

const cleanSongArtist = array => cleanStringArray(array.map(artist => artist.name));

const cleanArtistRes = json => json.items.map(item =>
  Object.assign({}, {
    name: item.name,
    photo: item.images[0],
    followers: item.followers.total.toLocaleString(),
    popularity: item.popularity,
    genres: cleanStringArray(item.genres),
  }));

const cleanUserRes = json => Object.assign(
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

const recentlyPlayedCleaner = json => json.items.map(song =>
  Object.assign({}, {
    title: song.track.name,
    artists: cleanSongArtist(song.track.artists),
  }));

const cleanSongRes = json => json.items.map(song =>
  Object.assign({}, {
    title: song.name,
    artists: cleanSongArtist(song.artists),
    album: song.album.name,
    image: song.album.images[0].url,
    popularity: song.popularity,
    uri: song.uri,
  }));

// start auth code flow
app.get('/login', (request, response) => response.status(200).redirect(`https://accounts.spotify.com/authorize/?client_id=${process.env.SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fstatify12%2Eherokuapp%2Ecom%2F&scope=user-read-private%20user-read-email%20user-top-read%20playlist-modify-public%20playlist-modify-private%20user-read-recently-played&state=34fFs29kd09`));

app.get('/test', (request, response) => response.status(200).send('Hello test'))

// get auth code, user info, top songs and recently played
app.post('/top-artists', (request, response) => {
  const { authCode } = request.body;
  // this will be response body
  const body = {};
  const formData = {
    'grant_type': 'authorization_code',
    'code': authCode,
    'redirect_uri': 'https://statify12.herokuapp.com/',
    'client_id': process.env.SPOTIFY_CLIENT_ID,
    'client_secret': process.env.SPOTIFY_SECRET_ID,
  };
  let formBody = [];
  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const property in formData) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(formData[property]);
    formBody.push(`${encodedKey}=${encodedValue}`);
  }
  formBody = formBody.join('&');
  // retrieve access token
  fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: formBody,
  }).then(res => res.json())
    .then((res) => {
    // copy access token to response body
      Object.assign(body, { access_token: res.access_token });
      console.log({body})
      // retrieve user info
      fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${body.access_token}`,
        },
      }).then(res => res.json())
        .then((res) => {
          console.log({me: res})
          // copy user info to response body
          Object.assign(body, { userInfo: cleanUserRes(res) });
          // retrieve top artists
          
          fetch('https://api.spotify.com/v1/me/top/artists?limit=50', {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${body.access_token}`,
            },
          }).then(res => res.json())
            .then((res) => {
            console.log({topArtistsRes: res})
            // copy top artists to response body
              Object.assign(body, { topArtists: cleanArtistRes(res) });
              // retrieve recently played songs
              fetch('https://api.spotify.com/v1/me/player/recently-played', {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${body.access_token}`,
                },
              }).then(res => res.json())
                .then((res) => {
                  // copy recently played to response body
                  Object.assign(body, { recentlyPlayed: recentlyPlayedCleaner(res) });
                })
                // send response
                // eslint-disable-next-line no-unused-vars
                .then(res => response.status(200).json({ body }))
                .catch(error => response.status(500).json({ error }));
            })
            .catch(error => response.status(500).json({ error }));
        })
        .catch(error => response.status(500).json({ error }));
    })
    .catch(error => response.status(500).json({ error }));
});

// get top songs
app.post('/top-songs', (request, response) => {
  const { token } = request.body;
  const urls = [
    'https://api.spotify.com/v1/me/top/tracks?limit=40&time_range=short_term',
    'https://api.spotify.com/v1/me/top/tracks?limit=40&time_range=medium_term',
    'https://api.spotify.com/v1/me/top/tracks?limit=40&time_range=long_term',
  ];
  Promise.all(urls.map((url) => {
    return fetch(url, {
      headers: {
        'Content-type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => res.json())
      .then(res => cleanSongRes(res))
      .catch(error => response.status(500).json({ error }));
  }))
    .then(res => response.status(200).json(res))
    .catch(error => response.status(500).json({ error }));
});

// post playlist to user profile
app.post('/post-playlist', (request, response) => {
  const payload = request.body;
  fetch(
    `https://api.spotify.com/v1/users/${payload.id}/playlists`,
    {
      body: JSON.stringify({
        name: `${payload.id}'s Top 40 ${payload.message}`,
        description: `Your Top 40 tracks ${payload.message}. Brought to you by Statify.`,
      }),
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${payload.token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    .then(res => res.json())
    .then((res) => {
      const playlistId = res.id;
      fetch(
        'https://api.spotify.com/v1/users/' +
        `${payload.id}/playlists/${playlistId}/tracks`,
        {
          body: JSON.stringify({
            uris: payload.array,
          }),
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${payload.token}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })
        .then(res => res.json())
        .then(res => response.status(201).json(res.snapshot_id))
        .catch(error => response.status(500).json({ error }));
    })
    .catch(error => response.status(500).json({ error }));
});

app.listen(app.get('port'), () => {
  // eslint-disable-next-line no-console
  console.log(`${app.locals.title} is running on ${app.get('port')}.`);
});

module.exports = app;
