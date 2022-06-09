/**
 * Initializes the visualisation.
 * Calls getVisualisationData()
 * @param stream The stream to be visualised
 */
function visualize(stream) {
    let bufferLength;
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

export { visualize }

//module.exports = visualize;