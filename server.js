// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

//var axios = require('axios');
var bodyParser = require('body-parser') //required for post requests

app.use(bodyParser.json());

app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.post("/inhale-event-internal", function (request, response) {
  console.log(request.body)

  // axios.post('/event-submit', {input_event: this.event})
  // .then(function (_response) {
  //   console.log(_response)
  //   response.json({"status": "success"})
  // })
  // .catch(function (error) {
  //   console.log(error);
  //   response.json({"status": "failure"})
  // });
});




app.post("/inhale-event-external", function (request, response) {
  console.log(request.body)
});

// listen for requests :)
var listener = app.listen(process.env.PORT || 4000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
