const Swal = require('sweetalert2');


// variable declaration
let audioCtx;
let analyser;
let bufferLength;
let dataArray;
const tapPopup = () => {
    Swal.fire({
        titleText: "Gently tap the SKOP's membrane",
        text: "If sound is detected, this means that the SKOP is active",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: false,
        showConfirmButton: false,
    })
}


function detection(mediaStream) {
    // make an array of tracks
    console.log(mediaStream);
    audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    analyser.getByteFrequencyData(dataArray);

    let source = audioCtx.createMediaStreamSource(mediaStream);
    source.connect(analyser);

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
    let id = setInterval(detect, 300);

    function detect(){
        analyser.getByteTimeDomainData(dataArray);
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
                return true;
            }
        }
    }
}

module.exports = detection;
