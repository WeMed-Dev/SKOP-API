export default class Doctor {
    private session;
    private publisher;
    private apiKeyVonage;
    private token;
    private sessionId;
    private apiKeyWemed;
    private currentFocus;
    constructor(APIKEY: any, TOKEN: any, SESSIONID: any, APIKEY_WEMED: any);
    static init(API_KEY_WEMED: any, ROOM_ID: any): Promise<Doctor>;
    private signalStartSkop;
    private signalStopUsingSkop;
    private signalGain;
    private signalUseAugmentedReality;
    private signalCurrentFocus;
    private signalMonoyer;
    useSkop(): void;
    stopUsingSkop(): void;
    /**
     * Sets the users current's Audio source.
     * @param {MediaStreamTrack} audioSource
     */
    setAudioSource(audioSource: any): void;
    getCurrentFocus(): string;
    setCurrentFocus(focus: string): void;
    setGain(gain: number): void;
    useAR(useAR: boolean): void;
    useMonoyer(toggle: boolean): void;
    disconnect(): void;
    mute(boolean: boolean): void;
    getMediaDevices(): Promise<MediaDeviceInfo[]>;
    setInputDevice(deviceId: string): void;
    publishVideo(boolean: boolean): void;
    publishAudio(boolean: boolean): void;
}
