import React from 'react';
import './App.css';
import './output.css'

import micOn from './assets/mic.svg';

import io from 'socket.io-client';
import RecordRTC, { StereoAudioRecorder } from 'recordrtc';
import ss from 'socket.io-stream';

function App() {
  
  const [noteText, setNoteText] = React.useState('')
  const [recording, setRecording] = React.useState(false)

  const [audioObjects, setAudioObjects] = React.useState({
    socket: null,
    recordRtc: null,
    mediaStream: null
  })

  React.useEffect(() => {
    const socketio = io('http://localhost:3000/');
    const socket = socketio.on('connect', () => {
      setRecording(false)
      console.log('Socket client connected.')
    });
    setAudioObjects(audioObjects => {
      const newObj = {...audioObjects, socket: socket};
      return newObj;
    });

    socket.on('results', (data) => {
      if(data && data.results[0] && data.results[0].alternatives[0]) {
        const newText = data.results[0].alternatives[0].transcript;
        setNoteText((noteText) => noteText + newText + ' ');
      }
    });

    return () => socketio.disconnect();
  }, [])

  function handleNoteText(event) {
    setNoteText(event.target.value);
  }

  function startRecording() {

    setRecording(true)

    navigator.getUserMedia({
      audio: true
    }, (stream) => {

      const recordAudio = RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        sampleRate: 44100, 

        recorderType: StereoAudioRecorder,

        numberOfAudioChannels: 1,

        timeSlice: 4000,

        desiredSampRate: 16000,

        ondataavailable: function(blob) {

          const stream = ss.createStream();

          ss(audioObjects.socket).emit('stream-transcribe', stream, {
              name: 'stream.wav', 
              size: blob.size
          });
          ss.createBlobReadStream(blob).pipe(stream);
        }
      });

      recordAudio.startRecording();
      setAudioObjects({...audioObjects, recordRtc: recordAudio, mediaStream: stream})

    }, function(error) {
        console.error(JSON.stringify(error));
    });

  }

  function stopRecording() {

    audioObjects.recordRtc.stopRecording();
    
    audioObjects.mediaStream.getTracks().forEach((track) => {
      track.stop();
    });

    setAudioObjects({...audioObjects, recordRtc: null, mediaStream: null});
    setRecording(false)
  }

  return (
    <div className="App py-10">
      
      <div className="flex items-center justify-center">
        <button onClick={!recording ? startRecording : stopRecording}>
          <img src={micOn} alt="mic icon" style={{backgroundColor: `${recording ? 'red' : ''}`}}/>
        </button>
      </div>

      <div className="flex items-center justify-center">

        <textarea value={noteText} onChange={recording ? () => {} : handleNoteText} style={{resize: "none", width: "450px"}} wrap="hard" rows="7" className="mx-6 my-2 p-4 font-mono border border-solid-2 border-black" maxLength="255" placeholder={'Take a note...'}>
        </textarea>
      </div>

    </div>
  );
}

export default App;
