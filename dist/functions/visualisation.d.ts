/**
 * Initializes the visualisation.
 * Calls getVisualisationData()
 * @param stream The stream to be visualised
 */
declare function visualize(stream: MediaStream): {
    timeData: any;
    analyzer: any;
    bufferLength: any;
    fftSize: number;
};
export { visualize };
