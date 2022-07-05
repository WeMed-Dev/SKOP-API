/**
 * Initializes the visualisation.
 * Calls getVisualisationData()
 * @param stream The stream to be visualised
 */
function visualize(stream:MediaStream) {
    let bufferLength:number;
    const audioCtx = new AudioContext();
    let analyzer = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);

    source.connect(analyzer);

    // How much data should we collect
    analyzer.fftSize = 2048;
    // pull the data off the audio
    bufferLength = analyzer.frequencyBinCount;
    // how many pieces of data are there?!?
    bufferLength = analyzer.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    return getVisualisationData(timeData, analyzer, bufferLength)
}

/**
 * Returns the visualisation data in a JSON format
 * @param timeData An array filled with the audio data
 * @param bufferLength The length of the timeData array
 * @param analyzer The Audio Node Analyzer used to collect the data
 *
 * @returns {{timeData, analyzer, fftSize: number, bufferLength}}
 */
function getVisualisationData(timeData, analyzer, bufferLength) {
    analyzer.getByteTimeDomainData(timeData);
    return {
        timeData : timeData,
        analyzer : analyzer,
        bufferLength : bufferLength,
        fftSize : 2048
    }
}


//module.exports = visualize;


//
// var canvas = document.getElementById("canvas");
// let ctx = canvas.getContext("2d");
// ctx.fillStyle = "#dbbd7a";
// ctx.fill();
//
// var fps = 60;
// var n = 1;
//
//
// var data = [
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82,
//     148, 149, 149, 150, 150, 150, 143, 82, 82, 82, 82, 82, 82, 82, ];
//
//
// drawWave();
//
// function drawWave() {
//     setTimeout(function() {
//         requestAnimationFrame(drawWave);
//         ctx.lineWidth = "2";
//         ctx.strokeStyle = 'green';
//
//         // Drawing code goes here
//         n += 1;
//         if (n >= data.length) {
//             n = 1;
//         }
//         ctx.beginPath();
//         ctx.moveTo(n - 1, data[n - 1]);
//         ctx.lineTo(n, data[n]);
//         ctx.stroke();
//
//         ctx.clearRect(n+1, 0, 10, canvas.height);
//
//     }, 1000 / fps);
// }

export { visualize }