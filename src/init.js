const Swal = require('sweetalert2');



var audioCtx;
var analyser;
var bufferLength;
var dataArray;



function detection(){

    audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    analyser.getByteFrequencyData(dataArray);
    console.log(analyser)

// Connect the source to be analysed
    navigator.mediaDevices.getUserMedia({audio: true}).then( function(stream) {
        let source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
    })


    Swal.fire({
        titleText: "Gently tap the SKOP's membrane",
        text: "If sound is detected, this means that the SKOP is active",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
    })
    detectTap()

}



// find a way to wait an audio input to be ready
function detectTap(){
    const id = setInterval(detect, 1000/60);

    function detect(){
        analyser.getByteTimeDomainData(dataArray);
        console.log("test")
        for (var i = 0; i < bufferLength; i++) {
            var v = dataArray[i] / 128.0;
            var y = v * 1500 / 2;
            if(y > 1200){
                console.log(y);
                clearInterval(id);
                Swal.fire({
                    title: 'The SKOP seems to be ready !',
                    text: 'Sound is detected',
                    icon: 'success',
                    confirmButtonText: 'OK',
                });
                return;
            }
        }
    }
}

module.exports = detection;
