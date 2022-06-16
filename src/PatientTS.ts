import {Filter} from "./Filter";
import Swal from "sweetalert2";
import OT from '@opentok/client'
import {checkAPIKEY, fetchVonage} from "./functions/request";
import {detection} from "./functions/detection";
import * as foyer from './functions/foyer';


function handleError(error) {
    if (error) console.error(error);
}

class PatientTS {

    // All boolean properties
    private usingSkop: boolean;
    private usingAR: boolean;
    private hasSkop: boolean;
    private skopDetected: boolean = false;

    //All API information
    private apiKeyVonage: string;
    private apiKeyWemed: string;
    private token : string;
    private sessionId: string;

    //All Vonage elements
    private session: OT.Session;
    private publisher: OT.Publisher;

    // Video related variables
    private stream:MediaStream;
    private cameraDimesions;

    private filter:Filter;
    private foyer:string;

    constructor(APIKEY, TOKEN, SESSIONID, APIKEY_WEMED){
        this.apiKeyVonage = APIKEY;
        this.token = TOKEN;
        this.sessionId = SESSIONID;
        this.apiKeyWemed = APIKEY_WEMED;
        this.filter = new Filter();
        let self = this;

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
            this.hasSkop = !!result.value;
        })

        const session = OT.initSession(this.apiKeyVonage, this.sessionId);
        this.session = session;

        //subscribe to a new stream in the session
        session.on('streamCreated', function streamCreated(event) {
            let subscriberOptions: OT.SubscriberProperties = {
                insertMode: 'append',
                width: '100%',
                height: '100%',
            }
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        });

        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        });

        // When a user receive a signal with a heartZone, it modifies the audio input of the user.
        session.on("signal:heartZone", function(event:any) {
            this.useSkop(event.data)
            console.log("Using Skop - " + event.data);
        });


        //When a patient receives a signal:stop it stops the filtering.
        session.on("signal:stop", function() {
            self.stopUsingSkop()
                .catch(e => {
                    console.log("Error stopping using Skop" + e);
                });
        });

        // When a user receive a signal with a gain, it modifies the gain of the user.
        session.on("signal:gain", function(event:any) {
            //console.log("Signal data: " + event.data);
            self.setGain(event.data)
        });

        // When a user receive a signal to use AR
        session.on("signal:useAR", async function(event:any) {
            await self.augmentedReality(event.data);
        });

        // initialize the publisher
        let publisherOptions: OT.PublisherProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%',
        };
        let publisher = OT.initPublisher('publisher', publisherOptions, handleError)
        this.publisher = publisher; // This variable cannot be used for the session.connect() method. But is used to access the publisher outside of the constructor.


        // Connect to the session
        session.connect(this.token, function callback(error) {
            if (error) {
                handleError(error);
            } else {
                // If the connection is successful, publish the publisher to the session
                session.publish(publisher , handleError);
                this.cameraDimensions = {
                    width: publisher.videoWidth(),
                    height: publisher.videoHeight()
                };
            }
        });

        navigator.mediaDevices.getUserMedia({audio: true,video: false}).then(stream =>{
            this.stream = stream;
        })
    }

    static async init(API_KEY_WEMED, ROOM_ID){
        return checkAPIKEY(API_KEY_WEMED).then(res =>{
            if(res === true){
                return fetchVonage(ROOM_ID).then(res=> {
                    return new PatientTS(res.apiKey, res.token, res.sessionId, API_KEY_WEMED);
                })
            }
        })

        return fetchVonage(ROOM_ID).then(res=> {
            return new PatientTS(res.apiKey, res.token, res.sessionId,API_KEY_WEMED)
        })
    }

    //--------- SKOP MANIPULATION METHODS ---------//
    private async detectSkop(){
        await detection(this.stream);
    }

    private async useSkop(heartZone){
        if(!this.skopDetected && this.hasSkop){
            await this.detectSkop()
            this.skopDetected = true;
        }
        this.setFoyer(heartZone);
        this.setUsingSkop(true);
        await this.filter.ModifyAudio(heartZone, this , this.apiKeyWemed);
        if(this.usingAR) await foyer.start(this.getFoyer());

    }

    private async stopUsingSkop(){
        this.setUsingSkop(false)
        await this.filter.defaultAudio(this.publisher);
    }


    //--------- AUGMENTED REALITY ---------//

    setupAugmentedReality(canvas, width, height){
        foyer.setupAR(canvas, width, height);
    }

    async augmentedReality(boolean){
        if(boolean){
            await foyer.init();

            // test
            this.usingAR = boolean;

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
        this.publisher.setAudioSource(audioSource);
    }

    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    private setGain(gain){
        //let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        //this.#filter.gain.setValueAtTime(gain, audioCtx.currentTime);
        this.filter.setGain(gain);
    }

    private setUsingSkop(isUsingSkop){
        this.usingSkop = isUsingSkop;
    }

    getSessionId(){
        return this.sessionId;
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


    //---- SESSION METHODS ----//

    public disconnect(){
        this.session.disconnect();
    }

}