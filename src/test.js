// define variables
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// getUserMedia block - grab stream
// put it into a MediaStreamAudioSourceNode
if (navigator.mediaDevices.getUserMedia) {
   navigator.mediaDevices.getUserMedia (
      // constraints: audio and video for this app
      {
         audio: true,
         video: false
      }).then(function(stream) {
        var options = {
          mediaStream : stream
        }

        var source = new MediaStreamAudioSourceNode(audioCtx, options);
        console.log(source)
        source.connect(audioCtx.destination);
      }).catch(function(err) {
       console.log('The following gUM error occurred: ' + err);
      });
} else {
  console.log('new getUserMedia not supported on your browser!');
}
