const ms = require('ms');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const dbb = require("./db.json")
// Replace YOUR_TELEGRAM_BOT_TOKEN with your actual bot token
const dotenv = require("dotenv")
dotenv.config()
const token = process.env.token
const bot = new TelegramBot(token, { polling: true });

bot.setMyCommands([
    { command: '/new', description: 'start a new session' },
    { command: '/current', description: 'retrieve current cycle progress' },
    { command: '/display', description: 'show current session progress' },
    { command: '/pause', description: 'pause current cycle' },
    { command: '/resume', description: 'resume current cycle' },
    { command: '/terminate', description: 'terminate current session' },
    { command: '/sessions', description: 'show current group sessions' }
]).then(() => bot.getMe().then(res =>
    console.log(`-------Telegram bot @${res.username} is running!--------`)
)).catch(err => { throw err })

let duration = 25 * 60 * 1000;
let breakDuration = 5 * 60 * 1000;
// Handle /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log(msg)
    if (msg.from.id == 5760947287) {
        bot.sendMessage(chatId, 'انت كلخرا', { reply_to_message_id: msg.message_id });
    } else {
        bot.sendMessage(chatId, 'Welcome!\nFuck Laith');
    }
});

//new
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text) {
        if (msg.text.startsWith("/new")) {
            const sessionName = msg.text.split(' ').slice(1).join(' ')
            if (sessionName == '') {
                if (dbb[msg.from.id].hasSession) {
                    bot.sendMessage(chatId, `<code>${dbb[msg.from.id].sessionName}</code> is still running!`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' });
                    return;
                }
                bot.sendMessage(chatId, `No Description Provided!`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' });
                return;
            }
            if (sessionName.length > 25) {
                bot.sendMessage(chatId, `Invalid Description.`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                });
                return;

            }
            if (!dbb[msg.from.id]) {
                dbb[msg.from.id] = {
                    hasSession: false,
                    sessionName: sessionName,
                    cycleNumber: 1,
                    isBreak: false,
                    date: Date.now() + (duration),
                    chatId: chatId,
                    paused: false,
                    remainTime: 0,
                    lastSeen: Date.now()
                }
                fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                    if (err) throw err;
                });

            }
            if (!dbb[msg.from.id].hasSession) {
                console.log("hi")
                dbb[msg.from.id] = {
                    hasSession: true,
                    sessionName: sessionName,
                    cycleNumber: 1,
                    isBreak: false,
                    date: Date.now() + (duration),
                    chatId: chatId,
                    paused: false,
                    remainTime: 0,
                    lastSeen: Date.now()
                }
            } else {
                bot.sendMessage(chatId, `<code>${dbb[msg.from.id].sessionName}</code> is still running!`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' });
                return;
            }
            fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                if (err) throw err;
            });


            let last = "";
            if (msg.from.username) {
                bot.sendMessage(chatId, `New Session!\nDescription: <code>${sessionName}</code>\nStarted By @${msg.from.username}`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                });
            } else {
                if (msg.from.last_name) last = " " + data.user.last_name;
                bot.sendMessage(chatId, `New Session!\nDescription: <code>${sessionName}</code>\nStarted By <a href="tg://user?id=${msg.from.id}">${msg.from.first_name + last}</a>`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                });
            }
            setTimeout(() => {
                checker(msg.from.id)
            }, duration + 300);
        }
    }
})

//terminate
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text) {
        if (msg.text.startsWith("/terminate")) {
            if (!dbb[msg.from.id]) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            } if (!dbb[msg.from.id].hasSession) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            }
            terminate(msg.from.id);
        }
    }
})

//current
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text) {
        if (msg.text.startsWith("/current")) {
            if (!dbb[msg.from.id]) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            } if (!dbb[msg.from.id].hasSession) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            }
            if (dbb[msg.from.id].paused) {
                bot.sendMessage(chatId, `<code>${dbb[msg.from.id].sessionName}</code> is paused!`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                })
                return;
            }
            let time = current(msg.from.id);
            if (dbb[msg.from.id].isBreak) {
                bot.sendMessage(chatId, `Your next cycle starts after ${time}`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' })
            } else {
                bot.sendMessage(chatId, `Your next break starts after ${time}`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' })
            }
            setTimeout(() => {
                checker(msg.from.id)
            }, (dbb[msg.from.id].date - Date.now()) + 300);
        }
    }
})

//display
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text) {
        if (msg.text.startsWith("/display")) {
            if (!dbb[msg.from.id]) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            } if (!dbb[msg.from.id].hasSession) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            }
            let time = current(msg.from.id);
            if (dbb[msg.from.id].paused) {
                time = current(msg.from.id, dbb[msg.from.id].remainTime)
                bot.sendMessage(chatId, `<code>${dbb[msg.from.id].sessionName}</code> is paused!`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                })
                if (dbb[msg.from.id].isBreak) {
                    bot.sendMessage(chatId, `Break time!\nSession: <code>${dbb[msg.from.id].sessionName}</code>\nTime remaining: ${time}`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' })
                } else {
                    bot.sendMessage(chatId, `Cycle #${dbb[msg.from.id].cycleNumber} is running.\nSession: <code>${dbb[msg.from.id].sessionName}</code>\nTime remaining: ${time}`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' })
                }
                return;
            }

            if (dbb[msg.from.id].isBreak) {
                bot.sendMessage(chatId, `Break time!\nSession: <code>${dbb[msg.from.id].sessionName}</code>\nTime remaining: ${time}`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' })
            } else {
                bot.sendMessage(chatId, `Cycle #${dbb[msg.from.id].cycleNumber} is running.\nSession: <code>${dbb[msg.from.id].sessionName}</code>\nTime remaining: ${time}`, { reply_to_message_id: msg.message_id, parse_mode: 'HTML' })
            }
            setTimeout(() => {
                checker(msg.from.id)
            }, (dbb[msg.from.id].date - Date.now()) + 300);
        }
    }
})

//pause
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text) {
        if (msg.text.startsWith("/pause")) {
            if (!dbb[msg.from.id]) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            } if (!dbb[msg.from.id].hasSession) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            }
            if (dbb[msg.from.id].paused) {
                bot.sendMessage(chatId, `<code>${dbb[msg.from.id].sessionName}</code> is already paused!`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                })
                return;
            }
            let time = current(msg.from.id);
            if (dbb[msg.from.id].isBreak) {
                dbb[msg.from.id].paused = true;
                dbb[msg.from.id].remainTime = dbb[msg.from.id].date - Date.now();
                fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                    if (err) throw err;
                });
                bot.sendMessage(chatId, `Break #${dbb[msg.from.id].cycleNumber} Paused\nTime remaining: ${time}`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                })

            } else {
                dbb[msg.from.id].paused = true;
                dbb[msg.from.id].remainTime = dbb[msg.from.id].date - Date.now();
                fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                    if (err) throw err;
                });
                bot.sendMessage(chatId, `Cycle Paused\nTime remaining: ${time}`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                })
            }
        }
    }
})

//resume
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text) {
        if (msg.text.startsWith("/resume")) {
            if (!dbb[msg.from.id]) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            } if (!dbb[msg.from.id].hasSession) {
                bot.sendMessage(chatId, `No Current Session!`, { reply_to_message_id: msg.message_id })
                return;
            }

            if (dbb[msg.from.id].paused) {
                if (dbb[msg.from.id].isBreak) {
                    dbb[msg.from.id].paused = false;
                    dbb[msg.from.id].date = dbb[msg.from.id].remainTime + Date.now();
                    fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                        if (err) throw err;
                    });
                    let time = current(msg.from.id);
                    bot.sendMessage(chatId, `Break #${dbb[msg.from.id].cycleNumber} Resumed\nTime remaining: ${time}`, {
                        reply_to_message_id: msg.message_id,
                        parse_mode: 'HTML'
                    })

                } else {
                    dbb[msg.from.id].paused = false;
                    dbb[msg.from.id].date = dbb[msg.from.id].remainTime + Date.now();
                    fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                        if (err) throw err;
                    });
                    let time = current(msg.from.id);
                    bot.sendMessage(chatId, `Cycle Resumed\nTime remaining: ${time}`, {
                        reply_to_message_id: msg.message_id,
                        parse_mode: 'HTML'
                    })
                }
            } else {
                bot.sendMessage(chatId, `<code>${dbb[msg.from.id].sessionName}</code> is running!`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'HTML'
                })
            }
            setTimeout(() => {
                checker(msg.from.id)
            }, dbb[msg.from.id].remainTime + 1000);
        }
    }
})

//sessions
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text) {
        if (msg.text.startsWith("/sessions")) {
            let total = ``;
            let promises = [];

            for (let i in dbb) {
                let promise = bot.getChatMember(msg.chat.id, i).then(function (data) {
                    let firstName = data.user.first_name;
                    let last = "";
                    let men = ``;
                    let userId = data.user.id;
                    if (data.user.username) {
                        men = `@${data.user.username}`;
                        if (dbb[i].hasSession) {
                            total += `${men} has <code>${dbb[i].sessionName}</code> going!\n`;
                        }
                    } else {
                        if (data.user.last_name) last = " " + data.user.last_name;
                        if (dbb[i].hasSession) {
                            total += `<a href="tg://user?id=${userId}">${firstName + last}</a> has <code>${dbb[i].sessionName}</code> going!\n`;
                        }
                    }
                });

                promises.push(promise);
            }
            setTimeout(() => {
                for (let i in dbb) {
                    let promise = bot.getChatMember(msg.chat.id, i).then(function (data) {
                        let firstName = data.user.first_name;
                        let last = "";
                        let men = ``;
                        let userId = data.user.id;
                        if (data.user.username) {
                            men = `@${data.user.username}`;
                            if (!dbb[i].hasSession) {
                                total += `${men} has no ongoing session!\n`;
                            }
                        } else {
                            if (data.user.last_name) last = " " + data.user.last_name;
                            if (!dbb[i].hasSession) {
                                total += `<a href="tg://user?id=${userId}">${firstName}</a> has no ongoing session!\n`;
                            }
                        }
                    });

                    promises.push(promise);
                }
            }, 100);


            setTimeout(() => {
                Promise.all(promises).then(function () {
                    if (total == ``) total = "فش كسم سيشنات";
                    bot.sendMessage(msg.chat.id, total, {
                        reply_to_message_id: msg.message_id,
                        parse_mode: 'HTML'
                    });
                });

            }, 140);

        }
    }
})

function current(y, t) {
    if (!t) t = (dbb[y].date - Date.now()) + 1000
    let m = parseInt(t / (60 * 1000));
    let s = (parseInt(t / (1000)) % 60);
    s = Math.abs(s)
    dbb[y].lastSeen = Date.now();
    return (m >= 10 ? m : ('0' + m)) + ":" + (s >= 10 ? s : '0' + s);
}
function checker(y) {
    if (dbb[y])
        if (dbb[y].date <= Date.now() && !dbb[y].paused && dbb[y].hasSession)

            if (dbb[y].isBreak) {
                dbb[y].cycleNumber = dbb[y].cycleNumber + 1;
                bot.sendMessage(dbb[y].chatId, `Break is Done.\nSession: <code>${dbb[y].sessionName}</code>\nCycle #${dbb[y].cycleNumber} Starts Now!`, { parse_mode: 'HTML' })
                dbb[y].date = (Date.now() + (duration)) - 1000;
                dbb[y].isBreak = false;

                fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                    if (err) throw err;
                });
            } else {
                bot.sendMessage(dbb[y].chatId, `Cycle #${dbb[y].cycleNumber} is Done.\nSession: <code>${dbb[y].sessionName}</code>\nTime to take a break!`, { parse_mode: 'HTML' });
                dbb[y].date = (Date.now() + (breakDuration)) - 1000;
                dbb[y].isBreak = true;

                fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
                    if (err) throw err;
                });
            }
}

function terminate(i){

    bot.sendMessage(dbb[i].chatId, `<code>${dbb[i].sessionName}</code> got terminated!`, { parse_mode: 'HTML' })

    dbb[i].hasSession = false;
    fs.writeFile("./db.json", JSON.stringify(dbb, null, 4), err => {
        if (err) throw err;
    });
}
setInterval(() => {
    for (let i in dbb) {
        if (dbb[i].date <= Date.now() && !dbb[i].paused && dbb[i].hasSession) {
            checker(i);
        }
    }
}, 10 * 1000);

setInterval(() => {
    for (let i in dbb) {
        if (((Date.now() - dbb[i].lastSeen) >= (60 * 60 * 1000)) && dbb[i].hasSession) {
            terminate(i);
        }
    }
}, 30 * 60 * 1000);

console.log('Bot is running...');
