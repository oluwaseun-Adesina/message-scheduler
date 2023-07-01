const mongoose = require('mongoose');

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

module.exports = mongoose.model('ScheduledMessage', scheduledSchema);

// const ScheduledMessage = mongoose.model('ScheduledMessage', scheduledSchema);