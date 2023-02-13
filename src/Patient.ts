import {Filter} from "./Filter";
import OT from '@opentok/client'
import {checkAPIKEY, fetchVonage} from "./functions/request";
import {detection} from "./functions/detection";
import * as focus from './functions/focus';
import testNetwork from "./functions/TestNetwork";



function handleError(error) {
    if (error) console.error(error);
}

export default class Patient {
    // All boolean properties
    private usingSkop: boolean;
    private usingAR: boolean;
    private faceCamera:boolean = true;

    //All API information
    private readonly apiKeyVonage: string;
    private readonly apiKeyWemed: string;
    private readonly token : string;
    private readonly sessionId: string;

    //All Vonage elements
    private session: OT.Session;
    private publisher: OT.Publisher;


    private audioStream:MediaStream;
    private videoStream:MediaStream;
    private inputDeviceID:string;
    private cameraDimensions;

    private filter:Filter;
    private focus:string;

    constructor(APIKEY, TOKEN, SESSIONID, APIKEY_WEMED){
        this.apiKeyVonage = APIKEY;
        this.token = TOKEN;
        this.sessionId = SESSIONID;
        this.apiKeyWemed = APIKEY_WEMED;
        this.filter = new Filter();
        let self = this;
        let ios = false;

        const session = OT.initSession(this.apiKeyVonage, this.sessionId);
        this.session = session;

        //subscribe to a new stream in the session
        session.on('streamCreated', function streamCreated(event) {
            let subscriberOptions: OT.SubscriberProperties = {
                insertMode: 'append',
                width: '100%',
                height: '100%',
                showControls: false,
            }
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
            if(ios){
                this.session.signal({
                    type: "iOS",
                    data: 'true'
                }, function(error) {
                    if (error) {
                        console.log('Error sending signal:' + error.message);
                    } else {
                        console.log('Signal sent.');
                    }
                });
            }
        });

        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        });

        // initialize the publisher
        let publisherOptions: OT.PublisherProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%',
            showControls: false,
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
                self.cameraDimensions = {
                    width: publisher.videoWidth(),
                    height: publisher.videoHeight()
                };
            }
        });



        //---- SIGNALS ----//
        // When a user receive a signal with a heartZone, it modifies the audio input of the user.
        session.on("signal:startSkop", function(event:any) {
            self.useSkop().then( () => {
                console.log("Using Skop - " + event.data);
            });
        });


        //When a patient receives a signal:stop it stops the filtering.
        session.on("signal:stopSkop", function() {
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

        session.on("signal:focus", function(event:any) {
            self.setFocus(event.data);
        });

        session.on("signal:monoyer", function(event:any) {
            if(event.data === "on"){
                self.toggleMonoyer(true);
            }
            else{
                self.toggleMonoyer(false);
            }
        })


        navigator.mediaDevices.getUserMedia({audio: true,video: true}).then(stream =>{
            let audioStreamTrack = stream.getAudioTracks()[0];
            //make audio stream from streamTrack
            this.audioStream = new MediaStream([audioStreamTrack]);

            //video streamTrack
            let videoStreamTrack = stream.getVideoTracks()[0];
            this.videoStream = new MediaStream([videoStreamTrack]);
        })
    }

    static async init(API_KEY_WEMED, ROOM_ID){

        return checkAPIKEY(API_KEY_WEMED).then(res =>{
            if(res === true){
                return fetchVonage(ROOM_ID).then(res=> {
                    testNetwork(OT, ROOM_ID);
                    return new Patient(res.apiKey, res.token, res.sessionId, API_KEY_WEMED);
                })
            }
        })
        // return fetchVonage(ROOM_ID).then(res=> {
        //     return new Patient(res.apiKey, res.token, res.sessionId,API_KEY_WEMED)
        // })
    }

    //--------- SKOP MANIPULATION METHODS ---------//
    private async detectSkop(){
        await detection(this.audioStream);
    }

    private async useSkop(){
        this.setUsingSkop(true);
        await this.filter.ModifyAudio(this.focus, this , this.apiKeyWemed);
    }

    private async stopUsingSkop(){
        this.setUsingSkop(false)
        await this.filter.defaultAudio(this,this.publisher);
    }

    //--------- AUGMENTED REALITY ---------//

    async augmentedReality(boolean){
        if(boolean){
            this.usingAR = boolean;
            await focus.init(this.videoStream).then(canvasStream => {
                this.initNewPublisher(canvasStream);
                focus.start(this.getFocus())
            })
        }
        else {
            focus.stop();
            navigator.mediaDevices.getUserMedia({audio: true,video: true}).then(stream =>{
                this.initNewPublisher(stream);
            })

        }
    }

    public toggleMonoyer(toggle:boolean){
        if(toggle === true) this.augmentedReality(true);
        else if (toggle === false) this.augmentedReality(false);
        focus.toggleMonoyer(toggle);
    }


    //--------- GETTER AND SETTER  ---------//

    /**
     * Sets the users current's Audio source.
     * @param {MediaStreamTrack} audioSource
     */
    setAudioSource(audioSource:MediaStreamTrack) {
        console.log("Dans setAudioSource" + audioSource);
        this.publisher.setAudioSource(audioSource).then(() => {
            console.log('Audio source changed.');
        }).catch((error) => {
            console.error('Error changing audio source', error);
        });
    }

    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    private setGain(gain){
        this.filter.setGain(gain);
    }

    private setUsingSkop(isUsingSkop){
        this.usingSkop = isUsingSkop;
    }

    public getSessionId(){
        return this.sessionId;
    }

    public getFocus(){
        return this.focus;
    }

    public setFocus(currentfocus){
        this.focus = currentfocus;
        if(this.usingSkop) this.useSkop()
        if(this.usingAR) focus.start(this.getFocus());
    }

    public getIdFocus(){
        switch (this.focus) {
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

    public getInputDeviceId(){
        console.log(this.inputDeviceID);
        return this.inputDeviceID;
    }



    //---- SESSION METHODS ----//
    public disconnect(){
        this.session.disconnect();
    }

    private initNewPublisher(stream:MediaStream){
        this.videoStream = stream;
        //console.log(this)
        let streamTrack = stream.getVideoTracks()[0];

        let tmp = this.publisher;
        const publisherOptions:OT.PublisherProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%',
            showControls: false,
            videoSource: streamTrack,
            facingMode: this.faceCamera ? 'user' : 'environment',
            audioBitrate: this.usingSkop ? 100000 : 40000,
        }
        const publisher = OT.initPublisher('publisher', publisherOptions, handleError);
        this.publisher = publisher;
        this.session.unpublish(tmp);
        this.session.publish(publisher , handleError);
        //TODO : remove this if it doesn't work
        if(this.usingSkop) this.useSkop().then(r => console.log("Using Skop"));
    }

    public mute(boolean:boolean){
        this.publisher.publishAudio(!boolean);
    }

    public turnCamera(){
        this.faceCamera = !this.faceCamera;
        if(this.usingAR){
            this.augmentedReality(true);
            this.initNewPublisher(this.audioStream);
        }
        // DO NOT TOUCH, THIS WORKS PERFECTLY
        // Even tho this is an audio stream it works whereas using the video stream it doesn't.
        // videoStream has all his media tracks ended after some time.
        // audioStream does not for some reason.
        // I will rework this later.

        else this.initNewPublisher(this.audioStream);
    }

    public getMediaDevices(){
        return navigator.mediaDevices.enumerateDevices();
    }

    public setInputDevice(deviceId:string){
        if(deviceId === undefined) throw new Error("Device ID is undefined");
        navigator.mediaDevices.getUserMedia({audio: {deviceId: deviceId}, video: true}).then(stream => {
            //replace the publisher audio source with the new stream
            this.setAudioSource(stream.getAudioTracks()[0]);
        })
        this.inputDeviceID = deviceId;
    }

    public publishVideo(boolean:boolean){
        this.publisher.publishVideo(boolean);
    }

    public publishAudio(boolean:boolean){
        this.publisher.publishAudio(boolean);
    }
}

