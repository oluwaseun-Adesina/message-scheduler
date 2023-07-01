const express = require("express");
const ScheduledMessage = require("./model/scheduled");

const { Client, IntentsBitField, Partials } = require("discord.js");
const mongoose = require("mongoose");
const moment = require("moment");
const momentTimezone = require("moment-timezone");
// const webhookListener = require('./entry.js');

momentTimezone.tz.setDefault("Africa/Lagos");

const timeZone = "Africa/Lagos";
// moment().format();
require("dotenv").config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.DirectMessages,
    IntentsBitField.Flags.MessageContent,
  ],
  partials: [Partials.Channel],
});

const token = `${process.env.TOKEN}`;
const mongoURI = process.env.MONGO_URI;

// Connect to the MongoDB database
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB connected");
    startBot();
  })
  .catch((err) => console.log(err));

const app = express();
app.use(express.json());

app.post('/schedule', async (req, res) => {
    try {
      // Parse the request body
      const { scheduledMessage, scheduledDateTime, channelId, interval, customIntervalMinutes } = req.body;
  
      // Validate the request parameters
      if (!scheduledMessage || !scheduledDateTime || !channelId || !interval) {
        return res.status(400).json({ error: 'Invalid request parameters.' });
      }
  
      // Parse the scheduledDateTime
      const dateTime = moment.tz(scheduledDateTime, 'YYYY-MM-DD HH:mm', timeZone).utc();
      if (!dateTime.isValid()) {
        return res.status(400).json({ error: 'Invalid date or time format. Please use the format: YYYY-MM-DD HH:MM.' });
      }
  
      // Save the scheduled message to the database
      const newScheduledMessage = new ScheduledMessage({
        date: dateTime.toDate(),
        content: scheduledMessage,
        channelId,
        interval,
        customIntervalMinutes: parseInt(customIntervalMinutes, 10) || 0,
        schedulerName: 'API',
      });
  
      await newScheduledMessage.save();
  
      return res.status(200).json({ message: 'Scheduled message saved successfully.' });
    } catch (error) {
      console.error('Error scheduling message:', error);
      return res.status(500).json({ error: 'An error occurred while scheduling the message.' });
    }
  });

  app.get('/schedule', async (req, res) => {
    try {
      // Find all the scheduled messages in the database
      const scheduledMessages = await ScheduledMessage.find();
  
      if (scheduledMessages.length === 0) {
        return res.status(404).json({ error: 'No scheduled messages found.' });
      }
  
      // Format the scheduled messages as a list
      const messageList = scheduledMessages.map((scheduledMessage) => {
        const dateTime = moment(scheduledMessage.date).tz(timeZone).format('YYYY-MM-DD HH:mm');
        return {
          id: scheduledMessage._id,
          content: scheduledMessage.content,
          dateTime,
          schedulerName: scheduledMessage.schedulerName,
        };
      });
  
      return res.status(200).json(messageList);
    } catch (error) {
      console.error('Error retrieving scheduled messages:', error);
      return res.status(500).json({ error: 'An error occurred while retrieving scheduled messages.' });
    }
  });

  app.patch('/scheduled-messages/:id', async (req, res) => {
    try {
      const messageId = req.params.id;
      const updates = req.body;
  
      // Find the scheduled message by ID and update it in the database
      const updatedMessage = await ScheduledMessage.findByIdAndUpdate(messageId, updates, { new: true });
  
      if (!updatedMessage) {
        return res.status(404).json({ error: `Scheduled message with ID "${messageId}" not found.` });
      }
  
      return res.status(200).json(updatedMessage);
    } catch (error) {
      console.error('Error updating scheduled message:', error);
      return res.status(500).json({ error: 'An error occurred while updating the scheduled message.' });
    }
  });
  
  app.delete('/scheduled-messages/:id', async (req, res) => {
    try {
      const messageId = req.params.id;
  
      // Find the scheduled message by ID and remove it from the database
      const deletedMessage = await ScheduledMessage.findByIdAndRemove(messageId);
  
      if (!deletedMessage) {
        return res.status(404).json({ error: `Scheduled message with ID "${messageId}" not found.` });
      }
  
      return res.status(200).json({ message: `Scheduled message "${deletedMessage.content}" with ID "${messageId}" deleted.` });
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      return res.status(500).json({ error: 'An error occurred while deleting the scheduled message.' });
    }
  });
    
  const server = app.listen(3000, () => {
    console.log('API server is running on http://localhost:3000');
  });

  async function startBot() {
    client.on('ready', () => {
        console.log(`Logged in as ${client.user.tag}`);
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        // if (message.author.bot || !message.member.permissions.has('sheduler')) {
        //     return message.reply('You do not have permission to use this command.');
        // }

        if (message.content.startsWith('!schedule')) {
            // Parse the command arguments (message, date, time, channel, interval, custom interval minutes)
            const args = message.content.split('/').map((arg) => arg.trim());
            const scheduledMessage = args[1]?.trim();
            const scheduledDateTime = args[2]?.trim(); // Format: YYYY-MM-DD HH:MM
            const mentionedChannel = message.mentions.channels.first();
            const interval = args[4]?.trim();
            let customIntervalMinutes = 0
        

            // Check if all arguments are provided
            if (!scheduledMessage) {
                return message.reply('Please provide the message for the scheduled task.');
            }

            if (!scheduledDateTime) {
                return message.reply('Please provide the date and time for the scheduled task in the format: YYYY-MM-DD HH:MM.');
            }

            if (!mentionedChannel) {
                return message.reply('Please mention the channel for the scheduled task.');
            }

            if (!interval){
                return message.reply('Please provide the interval for the scheduled task (yearly, monthly, daily, custom).')
            }

            if(interval === 'custom'){
                customIntervalMinutes = parseInt(args[5]?.trim(), 10)

                if (isNaN(customIntervalMinutes)){
                    return message.reply("Invalid custom interval minutes. Please provide a valid number of minutes")
                }
            }

            const dateTime = moment.tz(scheduledDateTime, 'YYYY-MM-DD HH:mm', timeZone).utc();


            // const dateTime = moment.utc(scheduledDateTime, 'YYYY-MM-DD HH:mm').local();
            if (!dateTime.isValid()) {
                return message.reply('Invalid date or time format. Please use the format: YYYY-MM-DD HH:MM');
            }

            // Save the scheduled message to the database
            const newScheduledMessage = new ScheduledMessage({
                date: dateTime.toDate(),
                content: scheduledMessage,
                channelId: mentionedChannel.id,
                interval,
                customIntervalMinutes,
                schedulerName: message.author.username,
            });

            await newScheduledMessage.save();

            message.reply(`Scheduled message "${scheduledMessage}" saved for ${scheduledDateTime}`);
        } else if (message.content.startsWith('!delete')) {
            // Parse the command arguments (message ID)
            const args = message.content.split(' ').map((arg) => arg.trim());
            const messageId = args[1]?.trim();
    
            // Check if the message ID is provided
            if (!messageId) {
                return message.reply('Please provide the ID of the scheduled message to delete.');
            }
    
            // Find the scheduled message by ID and remove it from the database
            const deletedMessage = await ScheduledMessage.findByIdAndRemove(messageId);
    
            if (!deletedMessage) {
                return message.reply(`Scheduled message with ID "${messageId}" not found.`);
            }
    
            message.reply(`Scheduled message "${deletedMessage.content}" with ID "${messageId}" deleted.`);
        } else if (message.content.startsWith('!list')) {
            // Find all the scheduled messages in the database
            const scheduledMessages = await ScheduledMessage.find();
    
            if (scheduledMessages.length === 0) {
                return message.reply('No scheduled messages found.');
            }
    
            // Format the scheduled messages as a list
            const messageList = scheduledMessages.map((scheduledMessage) => {
                const dateTime = moment(scheduledMessage.date).tz(timeZone).format('YYYY-MM-DD HH:mm');
                return `${scheduledMessage._id}: ${scheduledMessage.content} (${dateTime}) - ${scheduledMessage.schedulerName}`;
            }).join('\n');
    
            message.reply(`Scheduled messages:\n${messageList}`);
        }
    });

    // Check for scheduled messages every minute
    
    setInterval(async () => {
        const currentDate = new Date();

        console.log(`Checking for scheduled messages: ${currentDate}`)

        // due messages for interval 
        const dueMessages = await ScheduledMessage.find({
            $or: [
                { date: { $lte: currentDate}},
                { interval: 'custom', date: { $lte: moment().subtract({ minutes: { $mod: ['$customIntervalMinutes', 0]}}).toDate()}}
            ]
        })
        console.log(`Found ${dueMessages.length} messages`);

        let newDate;

        // Send the scheduled messages and remove them from the database
        for (const message of dueMessages) {
            try {
              const channel = await client.channels.fetch(message.channelId);
              if (channel) {
                await channel.send(message.content);
              }
              let newDate;
          
              if (message.interval === 'custom' || message.interval === '') {
                await ScheduledMessage.findByIdAndRemove(message._id);
              } else {
                if (message.interval === 'yearly') {
                  newDate = moment(message.date).add(1, 'year');
                } else if (message.interval === 'monthly') {
                  newDate = moment(message.date).add(1, 'month');
                } else if (message.interval === 'daily') {
                  newDate = moment(message.date).add(1, 'day');
                }
          
                await ScheduledMessage.findByIdAndUpdate(message._id, { date: newDate.toDate() });
              }
            } catch (error) {
              console.error(`Error sending scheduled message: ${error.message}`);
            }
          }

    }, 1000 * 60);

    client.login(token);
}


// Gracefully handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down...');
    server.close(() => {
      console.log('API server closed.');
      process.exit(0);
    });
  });