declare function checkAPIKEY(APIKEY: string): Promise<boolean>;
declare function saveRecord(sessionId: any, apiKey: any, idFoyer: any, soundRec: any): Promise<void>;
declare function fetchVonage(ROOM_ID: any): Promise<any>;
export { fetchVonage, checkAPIKEY, saveRecord, };
