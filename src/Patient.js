const Filter = require("./Filter");
const OT = require("@opentok/client");
const detection = require("./functions/detection");
const Swal = require('sweetalert2');
const blazeface = require('@tensorflow-models/blazeface');
const tf = require('@tensorflow/tfjs');

/**
 * Displays any error messages.
 * @param {*} error
 */
function handleError(error) {
    if (error) console.error(error);
}

class Patient {

    /**
     * @type {boolean} Indicates the current mode between conversation and gain.
     */
    #usingSkop;

    /**
     * @type {OT.Session} The session object.
     */
    #session

    #sessionId;

    #publisher;

    /**
     * @type {Filter} The filter object.
     */
    #filter

    #skopDetected = false;

    #stream

    #hasSkop

    constructor(apiKey, token, sessionId) {
        //TODO : constructor(API_KEY_WEMED, ROOM_ID)
        //TODO faire un fetch dans la BDD WeMed afin de vérifier que la clé API_WEMED
        // Si la clé est valide alors on fait un fetch pour récupérer les infos de la session
        // Sinon on affiche un message d'erreur

        // Ensuite on fait le traitement normal du constructeur


        // Used to access objects in functions.
        const self = this;
        this.#usingSkop = false;
        this.#filter = new Filter();


        Swal.fire({
            title: 'Welcome!',
            text: "Do you have a Skop ?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, I do.',
            cancelButtonText: "No, I don't.",
        }).then(result => {
            if(result.value){
                this.#hasSkop = true;
            }
            else{
                this.#hasSkop = false;
            }
            console.log(this.#hasSkop);
        })


        /**
         * @@type {OT.Session} The session object.
         */
        const session = OT.initSession(apiKey, sessionId);
        this.#session = session;
        this.#sessionId = sessionId;

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
            self.#useSkop(event.data)
            console.log("Using Skop - " + event.data);
        });

        //When a patient receives a signal:stop it stops the filtering.
        session.on("signal:stop", function(event) {
            self.#stopUsingSkop()
                .catch(e => {
                    console.log("Error stopping using Skop" + e);
                });
        });

        // When a user receive a signal with a gain, it modifies the gain of the user.
        session.on("signal:gain", function(event) {
            //console.log("Signal data: " + event.data);
            self.#setGain(event.data)
        });

        // initialize the publisher
        var publisherOptions = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };
        var publisher = OT.initPublisher('publisher', publisherOptions, handleError)
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

        navigator.mediaDevices.getUserMedia({audio: true,video: false}).then(stream =>{
            this.#stream = stream;
            console.log(this.#stream);
        })
    }

    //--------- SKOP MANIPULATION METHODS ---------//
    async #init(){
        await detection(this.#stream);
    }

    async #useSkop(heartZone){
        if(!this.#skopDetected){
            await this.#init()
            this.#skopDetected = true;
        }
        this.#setUsingSkop(true);
        await this.#filter.ModifyAudio(heartZone, this);
    }

    async #stopUsingSkop(){
        this.#setUsingSkop(false)
        await this.#filter.defaultAudio(this.#publisher, this);
    }

    //--------- AUGMENTED REALITY ---------//

    async trackEyes(){

        //wait for tf to be ready
        await tf.ready();
        let video = document.createElement('video');
        let model;

        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");

        const setupCamera = () => {
            navigator.mediaDevices
                .getUserMedia({
                    video: { width: 600, height: 400 },
                    audio: false,
                })
                .then((stream) => {
                    video.srcObject = stream;
                });
        };

        const detectFaces = async () => {
            const prediction = await model.estimateFaces(video, false);

            console.log(prediction);

            // draw the video first
            ctx.drawImage(video, 0, 0, 600, 400);

            prediction.forEach((pred) => {

                // draw the rectangle enclosing the face
                ctx.beginPath();
                ctx.lineWidth = "4";
                ctx.strokeStyle = "blue";
                // the last two arguments are width and height
                // since blazeface returned only the coordinates,
                // we can find the width and height by subtracting them.
                ctx.rect(
                    pred.topLeft[0],
                    pred.topLeft[1],
                    pred.bottomRight[0] - pred.topLeft[0],
                    pred.bottomRight[1] - pred.topLeft[1]
                );
                ctx.stroke();

                // drawing small rectangles for the face landmarks
                ctx.fillStyle = "red";
                pred.landmarks.forEach((landmark) => {
                    ctx.fillRect(landmark[0], landmark[1], 5, 5);
                });

            });
        };

        setupCamera();
        video.addEventListener("loadeddata", async () => {
            model = await blazeface.load();
            // call detect faces every 100 milliseconds or 10 times every second
            setInterval(detectFaces, 100);
        });


        /*
              [295.13, 177.64], // right eye
              [382.32, 175.56], // left eye
              [345.12, 250.61], // mouth
              [252.76, 211.37], // right ear
              [431.20, 204.93] // left ear
              [341.18, 205.03], // nose
    */


    }
    //--------- GETTER AND SETTER  ---------//

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
    #setGain(gain){
        //let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        //this.#filter.gain.setValueAtTime(gain, audioCtx.currentTime);
        this.#filter.setGain(gain);
    }

    #setUsingSkop(isUsingSkop){
        this.#usingSkop = isUsingSkop;
    }

    getSessionId(){
        return this.#sessionId;
    }
}

module.exports = Patient;