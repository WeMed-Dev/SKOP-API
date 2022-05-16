
let stream;
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
navigator.mediaDevices.getUserMedia({audio:true})
    .then(userStream => {
        stream = userStream;
        console.log(stream)
        visualiseAudio(stream)
    })



function visualiseAudio(stream){

    // analyze the audio stream and return the frequency data
    let analyser = audioCtx.createAnalyser();
    let source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    let data = new Uint8Array(analyser.frequencyBinCount);
    loopingVisualiseAudio(analyser, data);
}

// Loops and returns the frequency data
function loopingVisualiseAudio(analyser,data){
    //requestAnimationFrame(loopingVisualiseAudio(analyser, data));
    console.log(data)
    return analyser.getByteFrequencyData(data);
}


