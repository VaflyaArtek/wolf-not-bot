require('dotenv').config();
const TelegramApi = require('node-telegram-bot-api');
const token = process.env.token;
const bot = new TelegramApi(token, {polling: true});
const webAppUrl = 'https://main--wolfnot.netlify.app/#/';

const User = require('../database/models/User');

bot.setMyCommands([
    {command: '/start', description: 'Greeting'},
    {command: '/game', description: 'Play now'},
    {command: '/referral', description: 'Invite friends'},
]);

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text.startsWith('/start')) {
        await handleStartCommand(msg);
    } else if (text === '/game') {
        await handleGameCommand(msg);
    } else if (text === '/referral') {
        await handleReferralCommand(msg);
    } else {
        await bot.sendMessage(chatId, 'Unknown command');
    }
});

async function handleStartCommand(msg) {
    const chatId = msg.chat.id;
    try {
        const existingUser = await findUserByTelegramId(msg.from.id);
        const referralLink = `https://t.me/LandWolfNot_bot?start=${msg.from.id}`;
        const referId = extractReferIdFromMessage(msg.text);

        if (!existingUser) {
            await createNewUser(msg.from.id, msg.from.username, referralLink, referId);
            await sendWelcomeMessage(chatId, msg.from.username);
        } else {
            await sendWelcomeBackMessage(chatId, msg.from.username);
        }
    } catch (error) {
        console.error('Error handling start command:', error);
        await bot.sendMessage(chatId, 'Oops! Something went wrong.');
    }
}

async function handleGameCommand(msg) {
    const chatId = msg.chat.id;
    try {
        const user = await findUserByTelegramId(msg.from.id);
        if (user) {
            await bot.sendMessage(chatId, `Your balance: ${user.coins}`, {
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Play now!', web_app: {url: webAppUrl}}]
                    ]
                }
            });
        } else {
            await bot.sendMessage(chatId, 'User not defined. Click /start');
        }
    } catch (error) {
        console.error('Error handling game command:', error);
        await bot.sendMessage(chatId, 'Oops! Something went wrong.');
    }
}

async function handleReferralCommand(msg) {
    const chatId = msg.chat.id;
    try {
        const user = await findUserByTelegramId(msg.from.id);
        if (user) {
            const referrals = await User.find({referId: user.telegramId}, {__v: 0, coins: 0, referralLink: 0, _id: 0})
            await bot.sendMessage(chatId,
                `Invite your friends and earn more 🎁\nYour referral link: ${user.referralLink}\n\nYou have already invited ${referrals.length} referrals`)
        } else {
            await bot.sendMessage(chatId, 'User not defined. Click /start');
        }
    } catch (error) {
        console.error('Error handling referral command:', error);
        await bot.sendMessage(chatId, 'Oops! Something went wrong.');
    }
}

async function findUserByTelegramId(telegramId) {
    try {
        return await User.findOne({telegramId});
    } catch (error) {
        console.error('Error finding user by telegram ID:', error);
        throw error;
    }
}

function extractReferIdFromMessage(text) {
    const match = text.match(/\d+/g);
    return match ? +match[0] : null;
}

async function createNewUser(telegramId, username, referralLink, referId) {
    const newUser = {
        telegramId,
        username,
        referralLink,
        boost: 1,
        stamina: 1000,
        staminaLimit: 1000
    };
    if (referId !== null) {
        newUser.referId = referId;
        await rewardReferringUser(referId);
    }
    try {
        await new User(newUser).save();
    } catch (error) {
        console.error('Error creating new user:', error);
        throw error;
    }
}

async function rewardReferringUser(referId) {
    try {
        const referringUser = await User.findOne({ telegramId: referId });
        if (referringUser) {
            await User.updateOne({telegramId: referId}, {$inc: {coins:25000}})
        }
    } catch (error) {
        console.error('Error rewarding referring user:', error);
        throw error;
    }
}

async function sendWelcomeMessage(chatId, username) {
    try {
        if (username) {
            await bot.sendMessage(chatId, `Hello @${username}`);
        } else {
            await bot.sendMessage(chatId, 'Hello');
        }
    } catch (error) {
        console.error('Error sending welcome message:', error);
        throw error;
    }
}

async function sendWelcomeBackMessage(chatId, username) {
    try {
        if (username) {
            await bot.sendMessage(chatId, `Welcome back, @${username}!`);
        } else {
            await bot.sendMessage(chatId, 'Welcome back');
        }
    } catch (error) {
        console.error('Error sending welcome back message:', error);
        throw error;
    }
}