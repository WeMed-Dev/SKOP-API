import Swal from "sweetalert2";
import axios from "axios";

let url:string ="https://apps.mk-1.fr/WS_HALFRED_WEB/awws/WS_Halfred.awws";

async function checkAPIKEY(APIKEY:string){
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
       //We parse the response to get the data in a XML format
        console.log(res)
       if(res.status !== 200) {
           throw new Error("The Web Service is not available - Please contact WeMed if this problem persists.");
       }
       let json;
       //check if navigator is chrome
       //if(navigator.userAgent.indexOf("Chrome") > -1){
           let parser = new DOMParser();
           let xml = parser.parseFromString(res.data, "text/xml");
           console.log(xml)
           let jsonInXml = xml.getElementsByTagName("CheckAPIKEYResult")[0].textContent;
           json = JSON.parse(jsonInXml);
           console.log(json)
       if(json.Code == 201) return true;
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

