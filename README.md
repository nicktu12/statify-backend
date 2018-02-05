# [Statify](http://statify12.herokuapp.com/) - backend

Statify is an application built to display a Spotify user's listening statistics on a visual and interactive dashboard. Using the Spotify API, users are able to see different data sets over different periods of time. Statify was build using React, Redux and Router, with asynchronous API calls managed through Redux-Sagas. 

![statify](https://user-images.githubusercontent.com/26471447/33585724-ed249c3a-d922-11e7-9782-0d7ff1ce8545.gif)

## Getting Started

Clone down this repository and install npm. Execute the following command in your CLI.

```
npm install
```
API calls to the Spotify database are accomplished with a [Node/Express backend](https://github.com/nicktu12/statify-backend). The client id and secret id are hidden using dotenv.

To start the application on localhost:4000, enter the following command. 
```
node server.js
```

## Built With

* [Node](https://reactjs.org/) - For running JS outside the browser
* [Express](https://redux.js.org/) - Node web application gramework
* [node-fetch](https://github.com/bitinn/node-fetch) - Implementing fetch on the backend
* [Statify](https://github.com/nicktu12/statify/) - Statify React application repo

## Extensions

* Test endpoints
* Refactor initial access fetch

## Authors

* **Nick Teets** [Github](https://github.com/nicktu12)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Inspiration - [Visualify](https://visualify.io/)
