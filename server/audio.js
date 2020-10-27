// Required: Google secret key JSON file (https://cloud.google.com/speech-to-text/docs/quickstart-client-libraries?hl=en_US)
// Run in terminal(each dev session): $env:GOOGLE_APPLICATION_CREDENTIALS="absolute path of JSON file"

const PORT = process.env.PORT || 3000;

//Stream config values
const languageCode = 'en-US';
const encoding = 'LINEAR16';

const interimResults = false;
const sampleRateHertz = 16000;

//Imports
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const http = require('http');
const cors = require('cors');
const express = require('express');
const ss = require('socket.io-stream');
const speech = require('@google-cloud/speech');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../", "public", "index.html"));
});

const server = http.createServer(app);
const io = socketIo(server);

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

io.on('connect', (client) => {
    console.log('Socket client connected.');

    ss(client).on('stream-transcribe', (stream, data) => {
        // get the name of the stream
        const filename = path.basename(data.name);
        // pipe the filename to the stream
        stream.pipe(fs.createWriteStream(filename));
        // make an api call
        transcribeAudioStream(stream, function(results){
            console.log(results);
            client.emit('results', results);
        });
    })
});

// Creates a client
const speechClient = new speech.SpeechClient();

//Stream config object
const requestSTT = {
  config: {
    sampleRateHertz: sampleRateHertz,
    encoding: encoding,
    languageCode: languageCode
  },
  interimResults: interimResults,
}

async function transcribeAudioStream(audio, cb) { 
  const recognizeStream = speechClient.streamingRecognize(requestSTT)
  .on('data', (data) => {
    console.log(data);
    cb(data);
  })
  .on('error', (e) => {
    console.log(e);
  })

  audio.pipe(recognizeStream);
  audio.on('end', () => audio.end())
};
