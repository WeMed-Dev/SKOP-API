import Patient from "./Patient";
declare class Filter {
    audioCtx: AudioContext;
    biquadFilter: BiquadFilterNode;
    audioRecorder: MediaRecorder;
    gain: number;
    static AORTIC: string;
    static MITRAL: string;
    static PULMONARY: string;
    static TRICUSPID: string;
    constructor();
    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone.
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} focus
     * @param {*} patient instance of the patient class
     * @param {*} apiKeyWemed api key of the wemed server
     */
    ModifyAudio(focus: any, patient: Patient, apiKeyWemed: any): Promise<void>;
    private recordAudio;
    defaultAudio(patient: any, publisher: any): Promise<void>;
    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    setGain(gain: any): void;
}
export { Filter };
