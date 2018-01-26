// server.js
// where your node app starts

// init project
var dotenv = require('dotenv');
dotenv.load(); //get configuration file from .env

var aws = require('aws-sdk');
var mongodb = require('mongodb');
var multiparty = require('multiparty');
var express = require('express');
var util = require('util');
var fs = require('fs');
var uuidv4 = require('uuid/v4');
var path = require('path');
var moment = require('moment');
var sanitizer = require('sanitizer');
var axios = require('axios');
var bodyParser = require('body-parser');

var mailer = require('./services/mailer');

// set channel to post to here
var SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;
var slack = require('slack-notify')(SLACK_WEBHOOK);

var app = express();

app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false }))

var s3 = new aws.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});


var uploadFile = function(file_name, file_key, file_data, cb) {
  var params = {
    Body: file_data,
    Bucket: process.env.AWS_S3_UPLOADS_BUCKET,
    Key: file_key
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

// http://localhost:4000/?type=venue&profile=VENUE_NAME
app.get("/", function (request, response) {
  console.log(request.query.type);
  console.log(request.query.profile);
  response.sendFile(__dirname + '/views/index.html');
});


// Create new Event
app.post("/event", function (request, response) {

  var form = new multiparty.Form();

  var event = {};
  var event_management = {};

  form.parse(request, function(err, fields, files) {

    console.log(util.inspect({fields: fields, files: files.social_image}))



    /* --------------- Build an Event ------------------- */
    event.id = fields.id[0];
    event.title = fields.title[0];
    event.slug= fields.title[0].toLowerCase().replace(/ /g,"-"); // need more extensive regex for special chars

    var start_time_string = fields.time_start[0];
    event.time_start = moment(start_time_string, "YYYY-MM-DD hma").format('YYYY-MM-DD kk:mm:ss');
    
    console.log("Start:",start_time_string)
    
    var end_time_string = fields.time_end[0];
    event.time_end = moment(end_time_string, "YYYY-MM-DD hma").format('YYYY-MM-DD kk:mm:ss');

    console.log("End:",end_time_string)

    event.when = moment(fields.date[0]).format('dddd, MMMM Do, YYYY') +" <br /> "+ moment(fields.time_start[0]).format('h:mma') +" - "+ moment(fields.time_end[0]).format('h:mma') ;

    //event.time_start = moment(event.time_start).format('YYYY-MM-DD kk:mm:ss');
    //moment(fields.time_start[0]).format('YYYY-MM-DD kk:mm:ss');

    // console.log("FILES OBJ");
    // console.log(files);
    // console.log(files.length);
    // console.log("+++++++++++++++++++");

    event.social_image = "none";
    event.image = "none";

    if(Object.keys(files).length > 0){

      if(files.hasOwnProperty('social_image')){

        console.log('Begin uploading social media image');
        event.social_image = process.env.AWS_SERVER_URL + process.env.AWS_S3_UPLOADS_BUCKET +"/uploads/social/"+fields.id[0]+"_social.jpg";

        fs.readFile(files.social_image[0].path, function (err,data) {
          if (err) {
            return console.log(err);
          }
          var base64file = new Buffer(data,'binary');
          //var file_name = uuidv4() + path.extname(files.image[0].originalFilename);
          var file_name = fields.id[0]+"_social.jpg";
          var file_key = "uploads/social/"+file_name;

          uploadFile(file_name, file_key, base64file, function(err, data){
            if(err) {
              console.log(err);
              //response.status(500).json({"status":"failure"}); // TODO error handling REALLY!
            }
            else{
              console.log(util.inspect(data));
              //response.status(200).json({"status":"success"});
            }
          });
        });
      }

      if(files.hasOwnProperty('image')){
        console.log('Begin uploading hero image');
        event.image = process.env.AWS_SERVER_URL + process.env.AWS_S3_UPLOADS_BUCKET +"/uploads/"+fields.id[0]+".jpg";
        fs.readFile(files.image[0].path, function (err,data) {
          if (err) {
            return console.log(err);
          }
          var base64file = new Buffer(data,'binary');
          //var file_name = uuidv4() + path.extname(files.image[0].originalFilename);
          var file_name = fields.id[0]+".jpg";
          var file_key = "uploads/"+file_name;

          uploadFile(file_name, file_key, base64file, function(err, data){
            if(err) {
              console.log(err);
              //response.status(500).json({"status":"failure"}); // TODO error handling REALLY!
            }
            else{
              console.log(util.inspect(data));
              //response.status(200).json({"status":"success"});
            }
          });
        });
      }
    }

    event.address = fields.address[0];
    event.map_link = fields.map_link[0];
    event.organizers = fields.organizers[0];
    event.venues = fields.venues[0];
    event.brief_description = fields.brief_description[0];
    event.organizer_contact = fields.organizer_contact[0];
    event.admission_fee = fields.admission_fee[0];

    event.description = sanitizer.escape(fields.description[0]);

    event.ticket_link = fields.ticket_link[0];
    event.fb_event_link = fields.fb_event_link[0];
    event.eventbrite_link = fields.eventbrite_link[0];
    event.website = fields.website_link[0];
    
    var bitly_query_url ="https://api-ssl.bitly.com/v3/shorten?access_token="+process.env.BITLY_TOKEN+"&longUrl="+ encodeURI(process.env.SITE_URL+"/event/"+event.id)
  
    axios.get(bitly_query_url)
    .then(function (_response) {
      //console.log(_response.data.data.url);

      event.bitly_link = _response.data.data.url;
      console.log("BITLY:", event.bitly_link)

      var event_payload = `\n\{
        "id":"${event.id}",
        "title":"${event.title}",
        "slug":"${event.slug}",
        "when":"${event.when}",
        "time_start":"${event.time_start}",
        "time_end": "${event.time_end}",
        "website": "${event.website}",
        "image":"${event.image}",
        "social_image":"${event.social_image}",
        "venues":["${event.venues}"],
        "admission_fee": "${event.admission_fee}",
        "address": "${event.address}",
        "organizers":["${event.organizers}"],
        "map_link":"${event.map_link}",
        "brief_description":"${event.brief_description}",
        "description":"${event.description}",
        "links":["none"],
        "ticket_link":"${event.ticket_link}",
        "fb_event_link":"${event.fb_event_link}",
        "eventbrite_link":"${event.eventbrite_link}",
        "bitly_link":"${event.bitly_link}",
        "tags":["not-yet-implemented"]
      \}`;

      slackNotify("Review Me. Copy Me. Paste Me. Deploy Me." + event_payload + "\n Contact: "+event.organizer_contact);

    })
    .catch(function (error) {
      console.log(error);
      response.json({"status":"error", "report":"Unable to generate Bitly link"})
    }); 
      
      
      
    event_management = fields.event_management[0];

    // event_management.email = "shifting.planes@gmail.com";

    event.social_image = event.social_image

    var email_body_text = `
      <p>
        <b>Title:</b> ${event.title}
      </p>
      <p>
        <b>Date(s):</b> ${event.when.split(' at ')[0]}
      </p>
      <p>
        <b>Start time(s):</b> ${event.when.split(' at ')[1]}
      </p>
      <p>
        <b>Location (venue name and address):</b> ${event.venues}, ${event.address}
      </p>
      <p>
        <b>Admission fee:</b> ${event.admission_fee}
      </p>
      <p>
        <b>Brief Description:</b> ${fields.description[0]}
      </p>
      <p>
        <b>Link to more info on the event:</b> ${event.website}
      </p>
      <p>
        <b>Organizer Contact:</b> ${event.organizer_contact}

      </p>
        <img src = "${event.image}">`

      // var email_template = `<html>
      //   <head>
      //     <title>${event.title}</title>
      //   </head>
      //   <body>${email_body_text}</body>
      //   </html>`

      response.json({"status":"success", "summary": email_body_text});


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

})

app.post('/mail-it',function(request,response){

  console.log(request.body);
  var event_management = request.body;

  if(event_management.email_me === true){
    var mail_mail = {
      'subject':'Summary of Your Event Submission',
      'html':event_management.email_body,
      'reply_to': event_management.contact_email,
      // 'text':""
      'email': [event_management.contact_email]
    };

    mailer.sendEmail(mail_mail, function(err, data){
      if(err) {response.json({"status":"failed", "message": err})}

      response.json({"status":"success"});
    });
  }

  if(event_management.email_others === true){
    var prep_email_list = event_management.promo_emails.split(",");


    if(prep_email_list.length<1){
      response.json({"status":"failed", "message": "no email addresses provided"});
    }
    else if(prep_email_list.length>20){
      response.json({"status":"failed", "message": "limit on recipients reached"});
    }
    else{

      var email_list = [];

      prep_email_list.forEach(function(member){ email_list.push(member.trim())});

      console.log(email_list);

      var mail_mail = {
        'subject':'Event Submission - '+event_management.title,
        'html':event_management.email_body,
        'reply_to': event_management.contact_email,
        // 'text':""
        'email': email_list
      };

      mailer.sendEmail(mail_mail, function(err, data){
        if(err) {response.json({"status":"failed", "message": err})}

        response.json({"status":"success"});
      });


    }

  }

})

app.get("/venues", function(request, response){
  response.json({"status":"success",
    "venue_list": [
      {"id":"institute_193","name":"Institute 193", "address": "193 N Limestone, Lexington, KY 40507", "g_map_link":"https://goo.gl/maps/PXBsHGVauTB2"},
      {"id":"the_burl","name":"The Burl", "address": "375 Thompson Rd, Lexington, KY 40508", "g_map_link":"https://goo.gl/maps/MerUrvdgk9u"},
      {"id":"bolivar_art","name":"Bolivar Art Gallery - UK School of Art", "address": "236 Bolivar St, Lexington, KY 40508", "g_map_link":"https://goo.gl/maps/cFTbFbb7TmS2"},
      {"id":"cosmic","name":"Cosmic Charlie's", "address": "723 National Ave, Lexington, KY 40502", "g_map_link":"https://goo.gl/maps/DRBPSQwjpYu"},
      {"id":"best_friend","name":"Best Friend Bar", "address": "500 Euclid Ave, Lexington, KY 40502", "g_map_link":"https://goo.gl/maps/1A6vVwVXE432"},
      {"id":"whiskey_bear","name":"Whiskey Bear", "address":"119 Marion, Suite 170, Lexington, Kentucky", "g_map_link":"https://goo.gl/maps/7qSyqTGRyZU2"},
      {"id":"21c_lex","name":"21C Lexington", "address":"167 W Main St, Lexington, KY 40507","g_map_link":"https://goo.gl/maps/y53p9xLcNcU2"},
      {"id":"lal", "name":"Lexington Art League", "address":"209 Castlewood Dr, Lexington, Kentucky 40505","g_map_link":"https://goo.gl/maps/PmtR8kAQPRM2"},
      {"id":"singletary", "name":"Singletary Center for the Arts", "address":"405 Rose St, Lexington, Kentucky 40508", "g_map_link":"https://goo.gl/maps/uLQTd23sBsu"},
      {"id":"green_lantern", "name":"The Green Lantern Bar", "address":"497 W 3rd St, Lexington, Kentucky 40508", "g_map_link":"https://goo.gl/maps/7qVeS821NtR2"},
      {"id":"farrish", "name":"Farish Theater", "address":"140 E Main St, Lexington, Kentucky 40507", "g_map_link":"https://goo.gl/maps/ewNPYZsX95L2"},
      {"id":"brier_books", "name":"Brier Books", "address":"319 S Ashland Ave, Lexington, KY 40502", "g_map_link":"https://goo.gl/maps/ebYWdVHj27H2"},
      {"id":"lyric_theater", "name":"Lyric Theatre & Cultural Arts Center", "address":"300 E Third St, Lexington, KY 40508", "g_map_link":"https://goo.gl/maps/onMCXLbESuq"},
      {"id":"morland", "name":"Morlan Gallery", "address":"300 N Broadway, Lexington, KY 40508", "g_map_link":"https://goo.gl/maps/sCZ4P8bUkNw"}
      
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
