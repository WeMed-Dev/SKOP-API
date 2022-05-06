# SKOP API

The SKOP API is a javascript API for one-to-one video calls between a patient and a doctor, using a medical device : the Skop.


## Import
```html
<script src="Skop.js"></script>

```

Simply add a *script* into your html file. 

## Usage

### Creating an instance of the Skop

**Needed to connect the users together** :
- an API_KEY :
- a TOKEN  :
- a SESSION_ID : 

**Depending on the user you can either set the ROLE as :**
- "doctor" : He will be the one listening to the patient's heart through the Skop.
- "patient" : He will be the one using the Skop device.


```javascript

let skop = new Skop.Skop(apiKey, token, sessionId, role);

```


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.


## License
