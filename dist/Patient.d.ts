export default class Patient {
    private usingSkop;
    private usingAR;
    private faceCamera;
    private readonly apiKeyVonage;
    private readonly apiKeyWemed;
    private readonly token;
    private readonly sessionId;
    private session;
    private publisher;
    private audioStream;
    private videoStream;
    private inputDeviceID;
    private cameraDimensions;
    private filter;
    private focus;
    constructor(APIKEY: any, TOKEN: any, SESSIONID: any, APIKEY_WEMED: any);
    static init(API_KEY_WEMED: any, ROOM_ID: any): Promise<Patient>;
    private detectSkop;
    private useSkop;
    private stopUsingSkop;
    augmentedReality(boolean: any): Promise<void>;
    toggleMonoyer(toggle: boolean): void;
    /**
     * Sets the users current's Audio source.
     * @param {MediaStreamTrack} audioSource
     */
    setAudioSource(audioSource: MediaStreamTrack): void;
    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    private setGain;
    private setUsingSkop;
    getSessionId(): string;
    getFocus(): string;
    setFocus(currentfocus: any): void;
    getIdFocus(): 1 | 2 | 3 | 4;
    getInputDeviceId(): string;
    disconnect(): void;
    private initNewPublisher;
    mute(boolean: boolean): void;
    turnCamera(): void;
    getMediaDevices(): Promise<MediaDeviceInfo[]>;
    setInputDevice(deviceId: string): void;
    publishVideo(boolean: boolean): void;
    publishAudio(boolean: boolean): void;
}
