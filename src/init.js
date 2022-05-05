var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
var analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;

var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);
analyser.getByteTimeDomainData(dataArray);
analyser.getByteFrequencyData(dataArray);


// Connect the source to be analysed
navigator.mediaDevices.getUserMedia({audio: true}).then( function(stream) {
    let source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)
})

// find a way to wait an audio input to be ready
function detectTap(){
    let validate = false;
    analyser.getByteTimeDomainData(dataArray);

    for (var i = 0; i < bufferLength; i++) {    
        var v = dataArray[i] / 128.0;
        var y = v * 1500 / 2;
        if(y > 1200){
            console.log(y);
            validate = true
            alert("Skop ready to use");
            break;       
        }

    }
    if(!validate) setTimeout(detectTap, 200);
}



function detection(){
    alert("Gently tap the membrane while being quiet");
    detectTap();
}

module.exports = detection;
