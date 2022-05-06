# SKOP API

The SKOP API is a javascript API for one-to-one video calls between a patient and a doctor, using a medical device : the Skop.


## Usage

```html

<html>
<head>
	<meta charset='utf-8'/>
</head>
<body>

	<h1>Hello World!</h1>
	
</body>
<script src="Skop.js"></script>
</html>

```

The file is imported directly from the folder.

**It will be possible to just call the script for the web in the future**


### Create an instance of the Skop

Beforehand it is need to have :
- an API_KEY :
- a TOKEN  :
- a SESSION_ID : 

Depending on the user you can either set the ROLE as :
- "doctor" : He will be the one listening to the patient's heart through the Skop.
- "patient" : He will be the one using the Skop device.


```javascript

let skop = new Skop.Skop(apiKey, token, sessionId, role);

```



## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.


## License
