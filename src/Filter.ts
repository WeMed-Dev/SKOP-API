import {saveRecord} from "./functions/request";
import base64url from "base64url";


class Filter {
    public audioCtx:AudioContext;
    public biquadFilter:BiquadFilterNode
    public audioRecorder:MediaRecorder;
    public gain:number;

    static AORTIC = "Aortic";
    static MITRAL = "Mitral";
    static PULMONARY = "Pulmonary";
    static TRICUSPID = "Tricuspid";

    constructor(){
        this.gain = 10;
        this.audioCtx = new window.AudioContext;
        this.biquadFilter = this.audioCtx.createBiquadFilter();
    }

    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone.
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} focus
     * @param {*} patient instance of the patient class
     * @param {*} apiKeyWemed api key of the wemed server
     */
    public async ModifyAudio(focus, patient, apiKeyWemed) {
        if (focus == undefined) {
            throw new Error("No heartZone given - cannot modify audio");
        }

        //Version test avec getUserMedia
        let stream = await navigator.mediaDevices.getUserMedia({audio: true, video: false});

        let audioSource = this.audioCtx.createMediaStreamSource(stream);
        let audioDestination = this.audioCtx.createMediaStreamDestination();

        // Define filter frequencies for heart sounds
        const HEART_FREQ_MIN = 20; // minimum frequency for heart sounds
        const HEART_FREQ_MAX = 200; // maximum frequency for heart sounds
        const HEART_Q_FACTOR = 1; // quality factor for the heart filter

        // Define filter frequencies for respiratory sounds
        const RESP_FREQ_MIN = 100; // minimum frequency for respiratory sounds
        const RESP_FREQ_MAX = 1000; // maximum frequency for respiratory sounds
        const RESP_Q_FACTOR = 5; // quality factor for the respiratory filter

        // Configure bandpass filters for heart and respiratory sounds
        const heartFilter = this.audioCtx.createBiquadFilter();
        heartFilter.type = "bandpass";
        heartFilter.frequency.setTargetAtTime((HEART_FREQ_MIN + HEART_FREQ_MAX) / 2, this.audioCtx.currentTime, 0.01);
        heartFilter.Q.setTargetAtTime(HEART_Q_FACTOR, this.audioCtx.currentTime, 0.01);
        heartFilter.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.01);

        const respFilter = this.audioCtx.createBiquadFilter();
        respFilter.type = "bandpass";
        respFilter.frequency.setTargetAtTime((RESP_FREQ_MIN + RESP_FREQ_MAX) / 2, this.audioCtx.currentTime, 0.01);
        respFilter.Q.setTargetAtTime(RESP_Q_FACTOR, this.audioCtx.currentTime, 0.01);
        respFilter.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.01);

        // Connect the audio stream to the heart and respiratory filters, and then to the audio destination
        if (focus === Filter.AORTIC || focus === Filter.MITRAL || focus === Filter.TRICUSPID || focus === Filter.PULMONARY) {
            audioSource.connect(heartFilter);
            heartFilter.connect(audioDestination);
        } else {
            audioSource.connect(respFilter);
            respFilter.connect(audioDestination);
        }

        // Set the modified audio stream as the patient's audio source
        patient.setAudioSource(audioDestination.stream.getAudioTracks()[0]);

        console.log("Filter.ts - ModifyAudio : Audio is modified for the focus : " + focus);
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
                //audio.play();

                // Reading the data from the blob
                let reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async function() {
                    let base64data = reader.result;
                    // Encoding the data as base64URL
                    if (typeof base64data === "string") {
                        base64data = base64url.fromBase64(base64data.split(",")[1]);
                    }
                    //TODO enlever commentaire
                    // //Save the data in the database
                    // await saveRecord(patient.getSessionId(), apiKeyWemed, patient.getIdFocus(), base64data)
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
        this.biquadFilter.gain.setValueAtTime(gain, this.audioCtx.currentTime);
        this.gain = gain;
    }
}

export {Filter}

