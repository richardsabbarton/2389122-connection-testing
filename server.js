const express = require('express')
const app = express()
const OpenTok = require('opentok')


console.log(process.env['API'+'47807831'])

console.log('Neru Instance')
const neru = require('neru-alpha').neru
console.log('getting neru state')
const state = neru.getInstanceState()



app.use(express.static('public'))

app.get('/', (req, res) => {
  res.redirect("/app.html")
})

app.get('/session/:apiKey/:room',async (req, res)=>{
  try {
    const apiKey = req.params['apiKey']
    const roomName = req.params['room']
    let apiSecret = process.env['API' + apiKey]

    const opentok = new OpenTok(apiKey, apiSecret)
    
    console.log("Selected API Key: " + apiKey)
    console.log("getting session ID from State Engine for Room: " + roomName)
    
    const  sessionId  = await state.hget(apiKey, roomName)
    console.log(sessionId)

    if (sessionId !== null) {
      console.log(`Generating token for existing session: ${sessionId}`)
      const data = {
        sessionId: sessionId,
        apiKey: apiKey,
      }
      data.token = opentok.generateToken(sessionId)
      res.json(data)
    } else {
      const data = {
        apiKey: apiKey,
      }

      const sessionOptions = {
        mediaMode: "routed"
      }

      opentok.createSession(sessionOptions, (error, session)=>{
        if(error){
          console.log(error)
        } else {
          data.sessionId = session.sessionId
          data.token = opentok.generateToken(data.sessionId)
          res.json(data)
          console.log("setting session Id in state engine")
          let saveInfo = []
          saveInfo[roomName] = data.sessionId
          state.hset(apiKey, saveInfo)
        }
      })
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ message: error.message });
  }
})

app.get('/_/health', async (req, res) => {
  res.sendStatus(200);
});

const port = process.env.NERU_APP_PORT || process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Application Listing ON Port: ${port}`)
})
