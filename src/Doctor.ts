import OT from '@opentok/client';
import {checkAPIKEY, fetchVonage} from "./functions/request";
import Swal from "sweetalert2";

/**
 * Displays any error messages.
 * @param {*} error
 */
function handleError(error) {
    if (error) console.error(error);
}

export default class Doctor {
    private session: OT.Session;
    private publisher: OT.Publisher;

    private apiKeyVonage: string;
    private token:string;
    private sessionId:string;

    private apiKeyWemed: string;

    private currentFocus: string;

    constructor(APIKEY, TOKEN, SESSIONID, APIKEY_WEMED){
        this.apiKeyVonage = APIKEY;
        this.token = TOKEN;
        this.sessionId = SESSIONID;

        this.apiKeyWemed = APIKEY_WEMED;

        const session = OT.initSession(this.apiKeyVonage, this.sessionId);
        this.session = session;



        session.on('streamCreated', (event) => {
            let subscriberOptions:OT.SubscriberProperties = {
                insertMode: 'append',
                width: '100%',
                height: '100%',
            };
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        })

        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        })

        //Initialize the publisher
        let publisherOptions:OT.PublisherProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        }
        const publisher = OT.initPublisher('publisher', publisherOptions, handleError);
        this.publisher = publisher;

        // Connect to the session

        session.connect(this.token, (error) => {
            // If the connection is successful, publish to the session
            if (error) {
                console.log(error.message);
            }
            else {
                session.publish(publisher, handleError);
            }
        });


        session.on('signal:iOS', (event) => {
               Swal.fire({
                    title: 'Warning',
                    text: "Augmented reality is not supported on the patient's device.",
                    icon: 'warning',
                    confirmButtonText: 'OK'
               })
        })

    }

    static async init(API_KEY_WEMED, ROOM_ID){
        return checkAPIKEY(API_KEY_WEMED).then(res =>{
            if(res === true){
                return fetchVonage(ROOM_ID).then(res=> {
                    return new Doctor(res.apiKey, res.token, res.sessionId,API_KEY_WEMED)
                })
            }
        })
        // return fetchVonage(ROOM_ID).then(res=> {
        //     return new Doctor(res.apiKey, res.token, res.sessionId, API_KEY_WEMED)
        // })
    }


    //------ SIGNALING ------//

    private signalStartSkop() {
        this.session.signal({
            type: 'startSkop',
            data: 'start'
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    private signalStopUsingSkop() {
        this.session.signal({
            type: 'stopSkop',
            data: 'stop'
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    private signalGain(gain){
        this.session.signal({
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

    private signalUseAugmentedReality(useAR){
        this.session.signal({
            type: 'useAR',
            data: useAR
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    private signalCurrentFocus(focus:string){
        this.session.signal({
            type: 'focus',
            data: focus
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    private signalMonoyer(toggle:string){
        this.session.signal({
            type: 'monoyer',
            data: toggle
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }


    //--- USING SKOP ---//

    public useSkop(){
        if(this.currentFocus === null || this.currentFocus === undefined || this.currentFocus === ""){
            throw new Error("No focus set - You must set a focus before using the Skop");
        }
        this.signalStartSkop();
    }

    public stopUsingSkop(){
        this.signalStopUsingSkop();
    }

    //--- GETTERS & SETTERS ---//

    /**
     * Sets the users current's Audio source.
     * @param {MediaStreamTrack} audioSource
     */
    setAudioSource(audioSource) {
        this.publisher.setAudioSource(audioSource);
    }

    public getCurrentFocus(){
        return this.currentFocus;
    }

    public setCurrentFocus(focus:string){
        this.currentFocus = focus;
        this.signalCurrentFocus(focus);
    }

    public setGain(gain:number){
        if (gain === null || gain === undefined) {
            throw new TypeError("Gain cannot be null or undefined");
        }
        else if (isNaN(gain)) {
            throw new TypeError("Gain must be a number");
        }
        this.signalGain(gain);
    }

    public useAR(useAR:boolean){
        if (useAR === null || useAR === undefined) {
            throw new TypeError("Use AR cannot be null or undefined");
        }
        else if (typeof useAR !== "boolean") {
            throw new TypeError("Argument must be a boolean");
        }
        this.signalUseAugmentedReality(useAR);
    }

    public useMonoyer(toggle:boolean){
        this.signalMonoyer(toggle ? "on" : "off");
        if(toggle){
            Swal.fire({
                position: 'top',
                html: '<div> <img src="https://i.ibb.co/PFsd4cR/monoyer.png" id="monoyer" style="  top: 5%; left: 40%;"/>  </div>',
                showConfirmButton: false,
                showCloseButton: true,
            })
        }
    }
    //-- SESSION ---//
    public disconnect(){
        this.session.disconnect();
    }

    public mute(boolean:boolean){
        this.publisher.publishAudio(boolean);
    }

    public getMediaDevices(){
        return navigator.mediaDevices.enumerateDevices();
    }

    public setInputDevice(deviceId:string){
        navigator.mediaDevices.getUserMedia({audio: {deviceId: deviceId}, video: true}).then(stream => {
            //replace the publisher audio source with the new stream
            this.setAudioSource(stream.getAudioTracks()[0]);
        })

    }

    public publishVideo(boolean:boolean){
        this.publisher.publishVideo(boolean);
    }

    public publishAudio(boolean:boolean){
        this.publisher.publishAudio(boolean);
    }
}

