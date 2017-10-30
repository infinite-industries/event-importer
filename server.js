// server.js
// where your node app starts

// init project
var aws = require('aws-sdk');
var mongodb = require('mongodb');
// var multer = require('multer');
var multiparty = require('multiparty');
var express = require('express');
var util = require('util');
var dotenv = require('dotenv');
var fs = require('fs');
var uuidv4 = require('uuid/v4');
var path = require('path');

dotenv.load(); //get configuration file from .env

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


var uploadFile = function(file_name, file_data, cb) {
  var params = {
    Body: file_data,
    Bucket: process.env.AWS_S3_UPLOADS_BUCKET,
    Key: "uploads/"+file_name
  };

  s3.putObject(params, cb);
}

//var axios = require('axios');
// var bodyParser = require('body-parser') //required for post requests
//
// app.use(bodyParser.json());

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
app.post("/event", function (request, response) {

  var form = new multiparty.Form();

  form.parse(request, function(err, fields, files) {
    console.log(util.inspect({fields: fields, files: files.image[0]}));

    fs.readFile(files.image[0].path, function (err,data) {
      if (err) {
        return console.log(err);
      }
      var base64file = new Buffer(data,'binary');
      var file_name = uuidv4() + path.extname(files.image[0].originalFilename);

      uploadFile(file_name, base64file, function(err, data){
        if(err) {
          response.status(500).json({"status":"failure"});
        }
        else{
          // console.log(util.inspect(data));
          response.status(200).json({"status":"success"});
        }
      });
    });

  });

  // console.log('POST /event', request.body);
})

app.get("/venues", function(request, response){
  //  mongodb.MongoClient.connect(process.env.MONGO_DB_CONNECTION, function(err, db) {
  //   if(err) throw err;
  //
  //   var venues = db.collection('venues');
  //   venues.find({}).toArray(function(err, docs){
  //     response.json(docs);
  //   })
  //
  // });
  response.json({"status":"success",
    "venue_list": [
      {"name":"Institute 193"},
      {"name":"The Burl"},
      {"name":"School of Art Building"},
      {"name":"Cosmic Charlie's"},
      {"name":"Best Friend's Bar"}
    ]
  })
})



// listen for requests :)
var listener = app.listen(/*process.env.PORT ||*/ 4000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
