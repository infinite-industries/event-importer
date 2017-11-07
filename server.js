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
var moment = require('moment');
var sanitizer = require('sanitizer');
var axios = require('axios');
var bodyParser = require('body-parser');

dotenv.load(); //get configuration file from .env

// set channel to post to here
var SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;
var slack = require('slack-notify')(SLACK_WEBHOOK);

var app = express();

app.use(bodyParser.json());

var s3 = new aws.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});


var uploadFile = function(file_name, file_data, cb) {
  var params = {
    Body: file_data,
    Bucket: process.env.AWS_S3_UPLOADS_BUCKET,
    Key: "uploads/"+file_name
  };

  s3.putObject(params, cb);
}

var slackNotify = function(payload){
  slack.send({
   channel: '#test',
   icon_emoji: ':computer:',
   text: payload
  });
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


// Create new Event
app.post("/event", function (request, response) {

  var form = new multiparty.Form();

  form.parse(request, function(err, fields, files) {

    console.log(util.inspect({fields: fields}))

    /* --------------- Build and Event ------------------- */
    var event = {};

    event.id = fields.id[0];
    event.title = fields.title[0];
    event.slug= fields.title[0].toLowerCase().replace(/ /g,"-"); // need more extensive regex for special chars

    var time_string = fields.date[0] + " " + fields.time_start[0];
    event.time_start = moment(time_string, "YYYY-MM-DD hma").format('YYYY-MM-DD HH:mm:ss');
    time_string = fields.date[0] + " " + fields.time_end[0];
    event.time_end = moment(time_string, "YYYY-MM-DD hma").format('YYYY-MM-DD HH:mm:ss');


    event.when = moment(fields.date[0]).format('dddd, MMMM Do YYYY') +" at "+ fields.time_start[0] +" - "+ fields.time_end[0] ;

    //event.time_start = moment(event.time_start).format('YYYY-MM-DD kk:mm:ss');
    //moment(fields.time_start[0]).format('YYYY-MM-DD kk:mm:ss');

    if(fields.hasOwnProperty('social_image')){
      console.log('No social media image');
    }
    else{
      console.log('Begin uploading social media image');
      event.social_image = "https://s3.us-east-2.amazonaws.com/test-downloader/uploads/social/"+fields.id[0]+".jpg";
    }

    if(fields.hasOwnProperty('image')){
      console.log('No image');
    }
    else{
      console.log('Begin uploading hero image');
      event.image = "https://s3.us-east-2.amazonaws.com/test-downloader/uploads/"+fields.id[0]+".jpg";
    }

    event.address = fields.address[0];
    event.map_link = fields.map_link[0];
    event.organizers = fields.organizers[0];
    event.venues = fields.venues[0];
    event.brief_description = fields.brief_description[0];

    event.description = sanitizer.escape(fields.description[0]);

    event.ticket_link = fields.ticket_link[0];
    event.fb_event_link = fields.fb_event_link[0];
    event.eventbright_link = fields.eventbright_link[0];
    event.website = fields.website_link[0];

    var event_payload = `\n\{
      'id':'${event.id}',
      'title':'${event.title}',
      'slug':'${event.slug}',
      'when':'${event.when}',
      'time_start':'${event.time_start}',
      'time_end': '${event.time_end}',
      'website': '${event.website}',
      'image':'${event.image}',
      'social_image':'${event.social_image}',
      'venues':['${event.venues}'],
      'address': ${event.address},
      'organizers':['${event.organizers}'],
      'map_link':'${event.map_link}',
      'brief_description':'${event.brief_description}',
      'description':'${event.description}',
      'links':['none'],
      'ticket_link':'${event.ticket_link}',
      'fb_event_link':'${event.fb_event_link}',
      'eventbright_link':'${event.eventbright_link}',
      'bitly_link':'',
      'tags':['not-implemented-yet']
    \}`;

    slackNotify("Review Me. Copy Me. Paste Me. Deploy Me." + event_payload + "\n Contact email: "+fields.contact_email[0]);

    // axios.post('test3.infinite.industries/event-submit', {input_event: this.event})
    // .then(function (_response) {
    //   console.log(_response)
    //   response.json({"status": "success"})
    // })
    // .catch(function (error) {
    //   console.log(error);
    //   response.json({"status": "failure"})
    // });
  })
    response.json({"status":"success"});
})

app.get("/venues", function(request, response){
  response.json({"status":"success",
    "venue_list": [
      {"name":"Institute 193", "address": "193 N Limestone, Lexington, KY 40507", "g_map_link":"https://goo.gl/maps/PXBsHGVauTB2"},
      {"name":"The Burl", "address": "375 Thompson Rd, Lexington, KY 40508", "g_map_link":"https://goo.gl/maps/MerUrvdgk9u"},
      {"name":"Bolivar Art Gallery - UK School of Art", "address": "236 Bolivar St, Lexington, KY 40508", "g_map_link":"https://goo.gl/maps/cFTbFbb7TmS2"},
      {"name":"Cosmic Charlie's", "address": "723 National Ave, Lexington, KY 40502", "g_map_link":"https://goo.gl/maps/DRBPSQwjpYu"},
      {"name":"Best Friend Bar", "address": "500 Euclid Ave, Lexington, KY 40502", "g_map_link":"https://goo.gl/maps/1A6vVwVXE432"}
    ]
  })
})


app.post("/add-venue", function(request, response){
  var venue_payload = JSON.stringify(request.body);
  slackNotify("Review Me. Copy Me. Paste Me. Deploy Me." + venue_payload);
  response.json({"status": "success"});

})



// listen for requests :)
var listener = app.listen(/*process.env.PORT ||*/ 4000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
