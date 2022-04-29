const OT = require('@opentok/client');


/**
 * Displays any error messages.
 * @param {*} error 
 */
function handleError(error) {
    if (error) console.error(error);
}

/**
 * Name : Skop
 * Description : It represents an instance of a session using the SKOP.
 **/
class Skop {

    /**
    * @type {boolean} Indicates the current mode between conversation and gain.
    */
    #usingSkop;

    /**
     * @type {string} Indicates the role of the user. [Patient, Doctor]
     */
    #role

    /**
     * @type {OT.Session} The session object.
     */
    #session

    /**
     * @type {OT.session.publisher}  The publisher object.
     */
    #publisher;

    #filterClass

    #filteringInitiated = false;

    #recorder;



    DOCTOR_ROLE = "doctor"
    PATIENT_ROLE = "patient"



 
    /**
     * Creates the instance of the SKOP. 
     * Initializes the session and the publisher.
     * If there is a subscriber, it subscribes to the session.
     * @param {*} apiKey  The API key of the session.
     * @param {*} token  The token of the session.
     * @param {*} sessionId  The session id of the session.
     * @param {string} role  The role of the user. [Patient, Doctor]
     */
    constructor(apiKey, token, sessionId, role) {
        // Used to access objects in functions.
        const self = this;
        this.#usingSkop = false;
        this.#role = role;
        this.#filterClass = new Filter();
        this.#recorder = new Recorder();

        /**
         * @@type {OT.Session} The session object.
         */
        const session = OT.initSession(apiKey, sessionId);
        this.#session = session;

        //subscribe to a new stream in the session
        session.on('streamCreated', function streamCreated(event) {
            var subscriberOptions = {
              insertMode: 'append',
              width: '100%',
              height: '100%'
            };
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        });
        
        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        });

        // When a user receive a signal with a heartZone, it modifies the audio input of the user.
        session.on("signal:heartZone", function(event) {
            if(self.#role === self.DOCTOR_ROLE) return;
            self.useSkop(event.data)
            console.log("Using Skop - " + event.data);
        });

        //When a patient receives a signal:stop it stops the filtering.
        session.on("signal:stop", function(event) {
            if(self.#role === self.DOCTOR_ROLE) return;
            self.stopUsingSkop().then(
                console.log("Stopped using Skop")
            ).catch(e => {
                console.log("Error stopping using Skop" + e);
            });
        });


        // When a user receive a signal with a gain, it modifies the gain of the user.
        session.on("signal:gain", function(event) {
            //console.log("Signal data: " + event.data);
            self.setGain(event.data)
        });

        // initialize the publisher
        var publisherOptions = {
        insertMode: 'append',
        width: '100%',
        height: '100%'
        };
        var publisher = OT.initPublisher('publisher', publisherOptions, handleError); 
        this.#publisher = publisher; // This variable cannot be used for the session.connect() method. But is used to access the publisher outside of the constructor.

        // Connect to the session
        session.connect(token, function callback(error) {
        if (error) {
          handleError(error);
        } else {
          // If the connection is successful, publish the publisher to the session
          session.publish(publisher , handleError);
        }
        });
    }

    //--------- SKOP MANIPULATION METHODS ---------//
    skop(heartZone){
        if(heartZone === null || heartZone === undefined || heartZone === ""){
            this.signalStopUsingSkop();
        }
        else{
            this.signalHeartZone(heartZone);
        }
    }

    useSkop(heartZone){
        if(this.#role === this.DOCTOR_ROLE) return;

        if(!this.#filteringInitiated) {
            this.#filteringInitiated = true;
            this.#filterClass.init(this, heartZone).then(
                //this.#recorder.startRecording()
            )

        }
        else {
            // to avoid error when the user is using the skop and then receives a new signal, the recording is stopped.
            //this.#recorder.stopRecording();
            this.#filterClass.filtering(heartZone);
            //this.#recorder.startRecording();
        }

        this.setUsingSkop(true);

    }

    async stopUsingSkop(){
        if(this.#role === this.DOCTOR_ROLE) return;
        this.setUsingSkop(false)
        this.#filterClass.defaultAudio(this.#publisher);
        //this.#recorder.stopRecording();
    }

    //------ SIGNALING ------//

    signalHeartZone(signal) {
        this.#session.signal({
            type: 'heartZone',
            data: signal
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    signalStopUsingSkop() {
        this.#session.signal({
            type: 'stop',
            data: 'stop'
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    signalGain(gain){
        this.#session.signal({
            type: 'gain',
            data: gain
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }


    //----- GETTER & SETTER -----//
    /**
     * Returns the current role of the user.
     * @returns {string} The role of the user.
     */
    getRole(){
        return this.#role;
    }

    /**
     *  Returns the audio source of the user, if it is available.
     * @returns The current MediaStreamTrack of the user.
     */
    getAudioSource() {
        return this.#publisher.getAudioSource();
    }

    /**
     * Sets the users current's Audio source.
     * @param {MediaStreamTrack} audioSource
     */
    setAudioSource(audioSource) {
        this.#publisher.setAudioSource(audioSource);
    }

    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    setGain(gain){
        if(this.#role === this.DOCTOR_ROLE) return;
        //let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        //this.#filter.gain.setValueAtTime(gain, audioCtx.currentTime);

        this.#filterClass.setGain(gain);
    }

    setUsingSkop(isUsingSkop){
        this.#usingSkop = isUsingSkop;
    }

    getRecorder(){
        return this.#recorder;
    }
}

class Filter{

    audioCtx;
    biquadFilter;
    biquadFilterHighFreq;
    audioSource;
    audioDestination;
    initialised = false;
    AORTIC = "Aortic";
    MITRAL = "Mitral";
    PULMONARY = "Pulmonary";
    TRICUSPID = "Tricuspid";


    constructor(){
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.biquadFilter = this.audioCtx.createBiquadFilter();
        this.biquadFilterHighFreq = this.audioCtx.createBiquadFilter();
        this.audioDestination = this.audioCtx.createMediaStreamDestination();
    }

    async init(skop, heartZone){
        try{
            this.mediaStream = await navigator.mediaDevices.getUserMedia({audio: true,video: false})
            this.audioSource = this.audioCtx.createMediaStreamSource(this.mediaStream);

            //test attenuation
            this.biquadFilterHighFreq.type = "highshelf";
            this.biquadFilterHighFreq.frequency.value = 1000;
            this.biquadFilterHighFreq.gain.value = -10;

            this.biquadFilter.type = "lowshelf"; // choisir le param : https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
            this.biquadFilter.frequency.setValueAtTime(250, this.audioCtx.currentTime); // 250Hz
            this.biquadFilter.gain.setValueAtTime(10, this.audioCtx.currentTime);

            // If the zone is Pulmonary, we need to set the filter to a different frequency
            if (heartZone === this.PULMONARY){
                this.biquadFilter.type = "peaking";
                this.biquadFilter.frequency.setValueAtTime(290, this.audioCtx.currentTime);
                this.biquadFilter.gain.setValueAtTime(-10, this.audioCtx.currentTime);
            }

            // connect the nodes together
            this.audioSource.connect(this.biquadFilter);
            this.biquadFilter.connect(this.audioDestination);
            //this.biquadFilter.connect(this.audioCtx.destination); //UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT

            // Sets the OT.publisher Audio Source to be the modified stream.
            skop.setAudioSource(this.audioDestination.stream.getAudioTracks()[0])
            //skop.getRecorder().init(this.audioDestination.stream);
            this.initialised = true;
        }catch (error){
            handleError(error);
        }

    }

    /**
     * Change the filter mode, type and frequency depending on the category.
     * @param category The category of heart zones being listened to. { "cardiac", "respiratory" }
     */
    filtering(category){
        if(category === this.AORTIC || category === this.MITRAL || category === this.TRICUSPID){
            this.biquadFilter.type = "lowshelf";
            this.biquadFilter.frequency.setValueAtTime(250, this.audioCtx.currentTime); // 250Hz
            this.biquadFilter.gain.setValueAtTime(10, this.audioCtx.currentTime);
        }else if(category === this.PULMONARY){
            this.biquadFilter.type = "peaking";
            this.biquadFilter.frequency.setValueAtTime(290, this.audioCtx.currentTime);
            this.biquadFilter.gain.setValueAtTime(-10, this.audioCtx.currentTime);
        }
    }

    defaultAudio(skop){
        try{
            let defaultAudio = navigator.mediaDevices.getUserMedia({audio: true,video: false})
                .then(stream => {
                    let defStreamTrack = stream.getAudioTracks()[0];
                    skop.setAudioSource(defStreamTrack);
                })
        }catch (error){
            handleError(error);
        }
    }

    setGain(gain){
        this.biquadFilter.gain.setValueAtTime(gain, this.audioCtx.currentTime);
    }

    getAudioDestination(){
        return this.audioDestination;
    }

}

/**
 * Records the audio from the Skop when used on the patient.
 */
class Recorder{
    audioCtx;
    audioDestination;
    mediaRecorder;
    audioChunks;
    audioBlob;
    audioURL;
    audio;

    constructor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.audioChunks = [];
    }

    init(filterAudio){
        this.audioDestination = filterAudio;
        this.mediaRecorder = new MediaRecorder(filterAudio);

        this.mediaRecorder.addEventListener("dataavailable", event => {
            this.audioChunks.push(event.data);
        });

        this.mediaRecorder.addEventListener("stop", () => {
            this.audioBlob = new Blob(this.audioChunks, {type: "audio/wav"});
            this.audioUrl = URL.createObjectURL(this.audioBlob);
            this.audio = new Audio(this.audioUrl);
            this.audioChunks = [];
        });

        console.log("Recorder initialised");
    }

    startRecording(){
        if(this.mediaRecorder === undefined){
            console.log("Recorder not initialised");
            return;
        }
        this.mediaRecorder.start();
    }

    stopRecording(){
        this.mediaRecorder.stop();
        this.downloadAudio();
    }

    downloadAudio(){
        let a = document.createElement("a");
        a.href = this.audioUrl;
        a.download = "audio.wav";
        document.body.appendChild(a);
        a.click();
    }

    getAudio(){
        return this.audio;
    }
}


module.exports = { Skop : Skop,};