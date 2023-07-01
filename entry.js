const express = require('express');
const app = express();

app.use(express.json())

const PORT = process.env.PORT || 80;

class WebhookListener {
 listen() {
   app.get('/kofi', (req, res) => {
    const data = req.body.data;
    const { message, timestamp } = data;
    const date = data.date;
    const time = data.time;
    const channel = data.channel;
    const interval = data.interval;
    const custom = data.custom
    const customTimeInterval = data.timeInterval

    res.send({ status: 'OK' });

    this.emit(
        
    )
   });

   app.listen(PORT);
 }
}

const listener = new WebhookListener();
listener.listen();

module.exports = listener;