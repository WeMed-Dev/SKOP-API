# Using the Skop

## Creating an instance of the Skop

**Needed to connect the users together**:
- an API_KEY :
- a TOKEN  :
- a SESSION_ID :
> To get the API_KEY, TOKEN & SESSION_ID, you need to create an account on [Vonage](https://www.vonage.com/)
**Depending on the user you can either set its ROLE as :** <br>
- "doctor" : He will be the one listening to the patient’s heart through the Skop.
- "patient" :  He will be the one using the Skop device.

```javascript
// SkopAPI is the name of the library.
let skop = new SkopAPI.Skop(apiKey, token, sessionId, role);

```

## Listening the heart

the "doctor" has to choose a heart zone :
- Aortic
- Mitral
- Tricuspid
- Pulmonary

Then call *Skop(**chosen heart zone**)*

``` javascript
// the zone has to be a string starting with a capital letter
skop.skop("Aortic");

```

## Talking normally
To stop using the heart listening mode, you call the *Skop* method without any arguments. It will reset the patient's audio input and they will be able to communicate normally.

``` javascript

skop.skop();

```

## Setting the gain level


> the user ajusting the gain level must be the "doctor". Because this method signals the patient to adjust the gain level.

To set the volume coming from the patient through the *Skop* you can use the *signalGain()* method.
<br>
By default, the gain is set to 1. If set to a negative value, the sound will be attenuated.

```javascript

skop.signalGain(yourGainLevel);

```