import Swal from "sweetalert2";
import axios from "axios";

let url:string ="https://apps.mk-1.fr/WS_HALFRED_WEB/awws/WS_Halfred.awws";

async function checkAPIKEY(APIKEY:string){
    fetch("https://instind-pin1sq0qe-bengregory23.vercel.app/api/SKOP/checkAPIKEY", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            key: "4bbb7277-6f18-48a9-873a-04a90afe853a"
        })
    }).then(res => res.json()).then(data => console.log(data));

    return axios.post("https://instind-pin1sq0qe-bengregory23.vercel.app/api/SKOP/checkAPIKEY", {
        key: APIKEY
    }).then(res => {
        if(res.data.Message.toLowerCase().includes("ok")){
            return true;
        }
    }).catch(err => {
        return false;
    })
}

async function saveRecord(sessionId, apiKey, idFoyer, soundRec){
    let data = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Header/>
   <soapenv:Body>
      <sRec>{

"IdSession": "${sessionId}",

"APIKEY": "${apiKey}",

"IdFoyer": "${idFoyer}",

"SoundRec": "${soundRec}"

}</sRec>
   </soapenv:Body>
</soapenv:Envelope> `

    return await axios.post(url, data,{headers:
            {
                'Content-Type': 'text/xml',
                SOAPAction: "urn:WS_Halfred/Save_Records"
            }
    }).then(res => {
        console.log(res)
    }).catch(err => {
        console.log(err)
    })
}

function fetchVonage(ROOM_ID){
    return fetch("https://wemed-sessions.herokuapp.com/room/" + ROOM_ID)
        .then(data => data.json())
        .then(data => {
           return data;
        })
}

export {
    fetchVonage,
    checkAPIKEY,
    saveRecord,
}

