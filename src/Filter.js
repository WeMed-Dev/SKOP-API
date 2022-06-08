import {saveRecord} from "./functions/request";

class Filter{
    filter;
    gain;
    mediaRecorder;

    static AORTIC = "Aortic";
    static MITRAL = "Mitral";
    static PULMONARY = "Pulmonary";
    static TRICUSPID = "Tricuspid";

    constructor(){
        this.gain = 10; //default gain
    }

    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone.
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} heartZone
     * @param {*} patient instance of the patient class
     * @param {*} apiKeyWemed api key of the wemed server
     */
    async ModifyAudio(heartZone, patient, apiKeyWemed) {

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

            if(heartZone === Filter.AORTIC || heartZone === Filter.MITRAL || heartZone === Filter.TRICUSPID){
                biquadFilter.type = "lowshelf"; // low shelf filter
                biquadFilter.frequency.setValueAtTime(250, audioCtx.currentTime); // 250Hz
                biquadFilter.gain.setValueAtTime(this.gain, audioCtx.currentTime);

                audioSource.connect(biquadFilter);
                biquadFilter.connect(audioDestination);
            }

            if(heartZone === Filter.PULMONARY){ // les ondes entres 80 et 500 sont limitées

                biquadFilter.type = "peaking"; // peaking filter
                biquadFilter.frequency.setValueAtTime(290, audioCtx.currentTime);
                biquadFilter.Q.setValueAtTime(10, audioCtx.currentTime);

                // connect the nodes together
                audioSource.connect(biquadFilter);
                biquadFilter.connect(audioDestination);
            }

            console.log("Recording started");
            this.mediaRecorder = new MediaRecorder(audioDestination.stream);
            this.mediaRecorder.start();
            this.mediaRecorder.addEventListener("dataavailable", (event) => {
                let audio = document.createElement("audio");
                // use the blob from the MediaRecorder as source for the audio tag
                audio.src = URL.createObjectURL(event.data);
                this.sendAudio(patient.getSessionId(), apiKeyWemed, patient.getFoyer(),event.data);
                document.body.appendChild(audio);
            });

            // biquadFilter.connect(audioCtx.destination); //UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT

            // Sets the OT.publisher Audio Source to be the modified stream.
            patient.setAudioSource(audioDestination.stream.getAudioTracks()[0])
            console.log("SKOP : Audio input modified")
    }

    async defaultAudio(patient){
        try{
            if(this.mediaRecorder !== undefined){
                this.mediaRecorder.stop();
            }
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
    setGain(gain){
        let audioCtx = new window.AudioContext;
        this.filter.gain.setValueAtTime(gain, audioCtx.currentTime);
        this.gain = gain;
    }


    async sendAudio(sessionId, apiKey, idFoyer, soundRec) {
        let reader = new FileReader();
        reader.readAsDataURL(soundRec);
        reader.onloadend = async function() {
            let base64data = reader.result;
            await saveRecord(sessionId, apiKey, idFoyer, base64data)
        }
    }
}

export {Filter}