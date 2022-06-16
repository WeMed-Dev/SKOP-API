const Filter = require("./Filter");
const OT = require("@opentok/client");
const detection = require("./functions/detection");
const Swal = require("sweetalert2");
const foyer = require('./functions/foyer');
const {fetchVonage, checkAPIKEY} = require("./functions/request");



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

    #usingAR;

    /**
     * @type {boolean} Indicates if the user has a Skop.
     */
    #hasSkop

    /**
     *  @type {boolean} Indicates if the skop has been detected.
     */
    #skopDetected = false;

    /**
     * @type {OT.Session} The session object.
     */
    #session


    #apiKeyVonage

    #token

    #apiKeyWemed

    /**
     * @param {string} Current sessionId, this can be seen as the room id.
     */
    #sessionId;

    /**
     * Vonage element that represents the user's audio/video input.
     */
    #publisher;

    /**
     * @type {Filter} The filter object.
     */
    #filter

    #stream

    /**
     * The dimensions of the current stream.
     */
    #cameraDimensions

    /**
     * Current foyer behind listened
     */
    foyer;

    constructor(APIKEY, TOKEN, SESSIONID, APIKEY_WEMED) {
        // Used to access objects in functions.
        const self = this;
        this.#usingSkop = false;
        this.#filter = new Filter.Filter();
        this.#apiKeyVonage = APIKEY;
        this.#token = TOKEN;
        this.#sessionId = SESSIONID;

        this.#apiKeyWemed = APIKEY_WEMED;


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
            this.#hasSkop = !!result.value;
        })


        /**
         * @@type {OT.Session} The session object.
         */
        const session = OT.initSession(self.#apiKeyVonage, self.#sessionId);
        this.#session = session;

        //subscribe to a new stream in the session
        session.on('streamCreated', function streamCreated(event) {
            let subscriberOptions = {
                insertMode: 'append',
                width: '100%',
                height: '100%',
                resolution: '1280x720',
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
        session.on("signal:stop", function() {
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

        // When a user receive a signal to use AR
        session.on("signal:useAR", async function(event) {
            await self.augmentedReality(event.data);
        });

        // initialize the publisher
        let publisherOptions = {
            insertMode: 'append',
            width: '100%',
            height: '100%',
            resolution: '1280x720',
        };
        let publisher = OT.initPublisher('publisher', publisherOptions, handleError)
        this.#publisher = publisher; // This variable cannot be used for the session.connect() method. But is used to access the publisher outside of the constructor.


        // Connect to the session
        session.connect(self.#token, function callback(error) {
            if (error) {
                handleError(error);
            } else {
                // If the connection is successful, publish the publisher to the session
                session.publish(publisher , handleError);
                self.#cameraDimensions = {
                    width: publisher.videoWidth(),
                    height: publisher.videoHeight()
                };
            }
        });

        navigator.mediaDevices.getUserMedia({audio: true,video: false}).then(stream =>{
            this.#stream = stream;
        })
    }

    static async init(API_KEY_WEMED, ROOM_ID){
        // return checkAPIKEY(API_KEY_WEMED).then(res =>{
        //     if(res === true){
        //         return fetchVonage(ROOM_ID).then(res=> {
        //             return new Patient(res.apiKey, res.token, res.sessionId)
        //         })
        //     }
        // })

        return fetchVonage(ROOM_ID).then(res=> {
            return new Patient(res.apiKey, res.token, res.sessionId)
        })
    }

    //--------- SKOP MANIPULATION METHODS ---------//
    async #detectSkop(){
        await detection.detection(this.#stream);
    }

    async #useSkop(heartZone){
        if(!this.#skopDetected && this.#hasSkop){
            await this.#detectSkop()
            this.#skopDetected = true;
        }
        this.setFoyer(heartZone);
        this.#setUsingSkop(true);
        await this.#filter.ModifyAudio(heartZone, this , this.#apiKeyWemed);
        if(this.#usingAR) await foyer.start(this.getFoyer());

    }

    async #stopUsingSkop(){
        this.#setUsingSkop(false)
        await this.#filter.defaultAudio(this.#publisher, this);
    }

    //--------- AUGMENTED REALITY ---------//

    setupAugmentedReality(canvas, width, height){
        foyer.setupAR(canvas, width, height);
    }

    async augmentedReality(boolean){
        if(boolean){
            await foyer.init();

            // test
            this.#usingAR = boolean;

            //await foyer.start(this.getFoyer());
            console.log(this.getFoyer());
        }
        else {
            foyer.stop();
        }
    }

    //--------- GETTER AND SETTER  ---------//


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

    getFoyer(){
        return this.foyer;
    }

    getIdFoyer(){
        switch (this.foyer) {
            case "Aortic":
                return 1;
                break;
            case "Mitral":
                return 2;
                break;
            case "Pulmonary":
                return 3;
                break;
            case "Tricuspid":
                return 4;
                break;
        }
    }

    setFoyer(foyer){
        this.foyer = foyer;
    }

    disconnect(){
        this.#session.disconnect();
    }
}

module.exports = Patient;