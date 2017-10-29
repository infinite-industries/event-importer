// server.js
// where your node app starts

// init project
var aws = require('aws-sdk');
var mongodb = require('mongodb');
var multer = require('multer');
var express = require('express');

var app = express();

var s3 = new aws.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// var upload = multer({
//   dest: 'uploads/',
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.AWS_S3_UPLOADS_BUCKET
//   })
// })

var uploadFile = function(file_name, file_data) {
  var params = {
    Body: file_data,
    Bucket: process.env.AWS_S3_UPLOADS_BUCKET,
    Key: "uploads/"+file_name
  };

  s3.putObject(params, function(err, data) {
   if (err) console.log(err, err.stack);
   else     console.log(data);
  });
}

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

// Create new Event
app.post("/events", function (request, response) {
  console.log('POST /events', request.body);


  uploadFile('', '')
  uploadFile()


  //var image_upload = upload.array('image');
  //var social_image_upload = upload.array('social_image');

  var event_data = {

  }

  mongodb.MongoClient.connect(process.env.MONGO_DB_CONNECTION, function(err, db) {
    if(err) throw err;

    var events = db.collection('events');

    events.insert(event_data, function(err, result) {
      if(err) throw err;

      console.log('Event inserted');
    });
  });
})

app.get("/venues", function(request, response){
   mongodb.MongoClient.connect(process.env.MONGO_DB_CONNECTION, function(err, db) {
    if(err) throw err;

    var venues = db.collection('venues');
    venues.find({}).toArray(function(err, docs){
      response.json(docs);
    })

  });
})

// listen for requests :)
var listener = app.listen(4000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
