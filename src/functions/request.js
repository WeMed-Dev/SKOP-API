import Swal from "sweetalert2";
import axios from "axios";

let url = "http://217.160.58.144/WS_HALFRED_WEB/awws/WS_Halfred.awws";

async function checkAPIKEY(APIKEY){
    let data = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Header/>
   <soapenv:Body>
      <sApiKey>${APIKEY}</sApiKey>
   </soapenv:Body>
</soapenv:Envelope>`;

   return await axios.post(url, data,{headers:
            {
                'Content-Type': 'text/xml',
                SOAPAction: "urn:WS_Halfred/CheckAPIKEY"
            }
    }).then(res => {
        let parser = new DOMParser();
        let xml = parser.parseFromString(res.data, "text/xml")
        let json = JSON.parse(xml.activeElement.textContent)
       if(json.Code === 201) return true;
       else{
           Swal.fire({
               titleText: "WeMed API key invalid",
               text: "Please be sure to have a registered key.",
               icon: "error",
               allowOutsideClick: false,
               allowEscapeKey: false,
               allowEnterKey: false,
               showConfirmButton: true,
           })
           return false;
       }
    }).catch(err => {
        console.log(err)
    })
}

async function saveRecord(sessionId, apiKey, idFoyer, soundRec){
    console.log(soundRec)
    let data = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
   <soapenv:Header/>
   <soapenv:Body>
      <sRec>{

"IdSession": "${sessionId}",

"APIKEY": "${apiKey}",

"IdFoyer": "${2}",

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
    return fetch("https://test-wemed.herokuapp.com/room/" + ROOM_ID)
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

