import {saveRecord} from "./functions/request";
import base64url from "base64url";


class FilterTS{
    public filter:BiquadFilterNode;
    public audioRecorder:MediaRecorder;
    public gain:number;

    static AORTIC = "Aortic";
    static MITRAL = "Mitral";
    static PULMONARY = "Pulmonary";
    static TRICUSPID = "Tricuspid";

    constructor(){
        this.gain = 10;
    }

    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone.
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} heartZone
     * @param {*} patient instance of the patient class
     * @param {*} apiKeyWemed api key of the wemed server
     */
    public async ModifyAudio(heartZone, patient, apiKeyWemed) {

        if (heartZone == null) {
            throw new Error("No heartZone given - cannot modify audio");
        }
        // define variables
        const audioCtx = new window.AudioContext;
        //let audioSource = audioCtx.createMediaStreamSource(mediaStream);
        //let audioDestination = audioCtx.createMediaStreamDestination();

        //Version test avec getUserMedia
        let stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
        let audioSource = audioCtx.createMediaStreamSource(stream);
        let audioDestination = audioCtx.createMediaStreamDestination();

        //Create the biquad filter
        let biquadFilter = audioCtx.createBiquadFilter();
        this.filter = biquadFilter;

        if(heartZone === FilterTS.AORTIC || heartZone === FilterTS.MITRAL || heartZone === FilterTS.TRICUSPID){
            biquadFilter.type = "lowshelf"; // low shelf filter
            biquadFilter.frequency.setValueAtTime(250, audioCtx.currentTime); // 250Hz
            biquadFilter.gain.setValueAtTime(this.gain, audioCtx.currentTime);

            audioSource.connect(biquadFilter);
            biquadFilter.connect(audioDestination);
        }

        if(heartZone === FilterTS.PULMONARY){ // les ondes entres 80 et 500 sont limitées

            biquadFilter.type = "peaking"; // peaking filter
            biquadFilter.frequency.setValueAtTime(290, audioCtx.currentTime);
            biquadFilter.Q.setValueAtTime(10, audioCtx.currentTime);

            // connect the nodes together
            audioSource.connect(biquadFilter);
            biquadFilter.connect(audioDestination);
        }

        this.recordAudio(audioDestination.stream, patient, apiKeyWemed);

        // Sets the OT.publisher Audio Source to be the modified stream.
        patient.setAudioSource(audioDestination.stream.getAudioTracks()[0])
        console.log("SKOP : Audio input modified")
    }

    private recordAudio(stream:MediaStream, patient:any, apiKeyWemed:string){
        // Recording audio, when the recording is finished,
        // the audio is converted to a base64URL string and sent to a
        // webservice to be saved in the database through the saveRecord function
        let chunks = [];
        this.audioRecorder = new MediaRecorder(stream);
        this.audioRecorder.ondataavailable= e => {
            chunks.push(e.data);
            if(this.audioRecorder.state == "inactive"){
                let blob = new Blob(chunks, {'type': 'audio/wav'});

                //listen to the audio
                let audio = new Audio(URL.createObjectURL(blob));
                audio.play();

                // Reading the data from the blob
                let reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async function() {
                    let base64data = reader.result;
                    // Encoding the data as base64URL
                    if (typeof base64data === "string") {
                        base64data = base64url.fromBase64(base64data.split(",")[1]);
                    }
                    //Save the data in the database
                    await saveRecord(patient.getSessionId(), apiKeyWemed, patient.getIdFoyer(), base64data)
                }
            }
        }
        this.audioRecorder.start();
    }

    public async defaultAudio(patient){
        try{
            if(this.audioRecorder != null) this.audioRecorder.stop();

            let defaultAudio = await navigator.mediaDevices.getUserMedia({audio: true,video: false})
            let defStreamTrack = defaultAudio.getAudioTracks()[0];
            patient.setAudioSource(defStreamTrack);
            console.log("SKOP : Audio input set to default - No modifications")
        }catch(err){
            console.log(err)
        }
    }

    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    public setGain(gain){
        let audioCtx = new window.AudioContext;
        this.filter.gain.setValueAtTime(gain, audioCtx.currentTime);
        this.gain = gain;
    }
}

export {FilterTS}
