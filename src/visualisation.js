
const WIDTH = 800;
const HEIGHT = 400;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = WIDTH;
canvas.height = HEIGHT;
let analyzer;
let bufferLength;


function handleError(err) {
    console.log('You must give access to your mic in order to proceed');
}



async function getAudio() {
    const stream = await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .catch(handleError);

    const audioCtx = new AudioContext();
    analyzer = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyzer);

    // How much data should we collect
    analyzer.fftSize = 2 ** 10;
    // pull the data off the audio
    bufferLength = analyzer.frequencyBinCount;
    // how many pieces of data are there?!?
    bufferLength = analyzer.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);
    drawTimeData(timeData);
    //drawFrequency(frequencyData);
}



function drawTimeData(timeData) {
    // inject the time data into our timeData array
    analyzer.getByteTimeDomainData(timeData);
    // now that we have the data, lets turn it into something visual
    // 1. Clear the canvas TODO
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    // 2. setup some canvas drawing
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffc600";
    ctx.beginPath();
    const sliceWidth = WIDTH / bufferLength;
    let x = 0;
    timeData.forEach((data, i) => {
        const v = data / 128;
        const y = (v * HEIGHT) / 2;
        // draw our lines
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        x += sliceWidth;
    });

    ctx.stroke();

    // call itself as soon as possible
    requestAnimationFrame(() => drawTimeData(timeData));
}

getAudio();

