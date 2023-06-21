const { Client, IntentsBitField, Partials } = require('discord.js');
const mongoose = require('mongoose');
const moment = require('moment');
const momentTimezone = require('moment-timezone');
const { parse } = require('path');
momentTimezone.tz.setDefault('Africa/Lagos');

const timeZone = 'Africa/Lagos';
moment().format()
require('dotenv').config();

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



// Define the scheduled message schema
const scheduledSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    channelId: {
        type: String,
        required: true,
    },
    interval: {
        type: String,
        enum: ['yearly', 'monthly', 'daily', 'custom'],
        required: true,
    },
    customIntervalMinutes: {
        type: Number,
        default: 0,
    },
    schedulerName: {
        type: String,
        required: true,
    },
});

const ScheduledMessage = mongoose.model('ScheduledMessage', scheduledSchema);

// Connect to the MongoDB database
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        startBot();
    })
    .catch((err) => console.error(err));

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

