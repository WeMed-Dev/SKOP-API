const axios = require("axios");
const visualisation = require('./functions/visualisation');

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
     */
    async ModifyAudio(heartZone, patient, mediaStream) {

        try{
            if (heartZone == null || heartZone == undefined) {
                throw new Error("No heartZone given");
            }
            // define variables
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
                biquadFilter.gain.setValueAtTime(10, audioCtx.currentTime);

                audioSource.connect(biquadFilter);
                biquadFilter.connect(audioDestination);

            }


            if(heartZone === Filter.PULMONARY){ // les ondes entres 80 et 500 sont limitées

                biquadFilter.type = "peaking"; // peaking filter
                biquadFilter.frequency.setValueAtTime(290, audioCtx.currentTime);
                biquadFilter.Q.setValueAtTime(this.gain, audioCtx.currentTime);

                // connect the nodes together
                audioSource.connect(biquadFilter);
                biquadFilter.connect(audioDestination);
            }

            console.log("Recording started");
            this.mediaRecorder = new MediaRecorder(audioDestination.stream);
            this.mediaRecorder.start();
            this.mediaRecorder.addEventListener("dataavailable", (event) => {
                var audio = document.createElement("audio");
                // use the blob from the MediaRecorder as source for the audio tag
                audio.src = URL.createObjectURL(event.data);
                this.sendAudio(event.data, heartZone, patient);
                document.body.appendChild(audio);
                audio.play();
            });






            // biquadFilter.connect(audioCtx.destination); //UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT

            // Sets the OT.publisher Audio Source to be the modified stream.
            patient.setAudioSource(audioDestination.stream.getAudioTracks()[0])
            console.log("SKOP : Audio input modified")
        }catch(error){
            handleError(error);
        }
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
            handleError(err)
        }
    }

    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    setGain(gain){
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.filter.gain.setValueAtTime(gain, audioCtx.currentTime);
        this.gain = gain;
    }


    sendAudio(audioBlob, heartZone, patient) {
        /*
        //Create a FormData object
        let formData = new FormData();
        // Append the audio file to the form data
        formData.append("file", audioBlob);
        // Append the session id to the form data
        formData.append("sessionId", patient.getSessionId());
        // Append the zone to the form data
        formData.append("zone", heartZone);
        console.log(Array.from(formData))

        // Send the form data to the server
        axios.post('http://localhost:3000/audio', formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            }
        })
            .catch(err => {
                console.log(err);
            })



        // TESTING
        axios.get('http://localhost:3000/last')
            .then(res =>{
                console.log("res.data.data : ", res.data.data);

                let array = new Uint8Array(res.data.data.data);

                // create audio element and set its source to the blob
                //convert res to blob
                let blob = new Blob([array], {type: 'audio/ogg; codecs=opus'});
                console.log(blob);

                //create URL + audio element
                let url = window.URL.createObjectURL(blob);
                let audio = document.createElement('audio');
                audio.src = url;
                audio.controls = true;

                //append audio element to the page
                document.body.appendChild(audio);
            })
    }
    */


        var reader = new FileReader();
        reader.onload = function() {
            console.log(reader.result);
            axios.post("http://localhost:3000/audioJson", {
                sessionId: patient.getSessionId(),
                zone: heartZone,
                //TODO : change to base64
                binary: reader.result
            }, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
                .catch(err => {
                    console.log(err);
                })
                .then(res => {
                    console.log(res);
                })
                .catch(err => {
                    console.log(err);
                });
        }
        reader.readAsArrayBuffer(audioBlob);
    }
}

module.exports = Filter;