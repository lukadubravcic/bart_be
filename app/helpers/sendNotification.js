const emailNotificationCreators = require('../helpers/emailNotifications');

const User = require('../models/User');
const Punishment = require('../models/Punishment');
const Pref = require('../models/Pref');

const sendmail = require('sendmail')({
    logger: {
        debug: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    }
});

const constants = require('../config/constants');

const BART_MAIL = constants.BART_MAIL // 'Bart@barted.com';
const APP_LINK = constants.APP_ADRRESS //'localhost:8000';

const userPrefNotifications = [constants.notifyFailed, constants.notifyDone, constants.notifyTrying];


function sendMail(from, to, subject, mailContent) {
    sendmail({
        from: from,
        to: to,
        subject: subject,
        text: mailContent,
    }, function (err, reply) {
        console.log(err && err.stack);
        console.dir(reply);
    }).then(() => {
        console.log('mail sent')
    });
}

const notifyUser = (senderId, receiveingId, punishmentId, notificationType) => {

    let notificationContent = 0;
    let sender = 0;
    let receiver = 0;
    let punishment = 0;
    let prefs = 0;

    let queries = [];

    senderId ? queries.push(getUser(senderId)) : queries.push(null);
    receiveingId ? queries.push(getUser(receiveingId)) : queries.push(null);
    punishmentId ? queries.push(getPunishment(punishmentId)) : queries.push(null);
    //inArray(notificationType, userPrefNotifications) ? queries.push(getUserPreferences(receiveingId)) : queries.push(null);

    Promise.all(queries).then(queryData => {

        sender = queryData[0];
        receiver = queryData[1];
        punishment = queryData[2];
        prefs = queryData[3];

        notificationContent = createNotificationContent({
            sender: sender,
            receiver: receiver,
            punishment: punishment,
            prefs: prefs,
            notificationType: notificationType
        });

        console.log(notificationContent);

        /* if (notificationContent) {
            sendMail(from, to, subject, mailContent);
        }; */
    });
}

function createNotificationContent(data) {

    switch (data.notificationType) {
        case constants.signup:
            return emailNotificationCreators.signUpConfirmation();
            break;
        case constants.passwordResetConfirmation:
            return emailNotificationCreators.passwordResetConfirmation(resetPwdLink);
            break;
        case constants.newPassword:
            return emailNotificationCreators.newPassword(temporaryPwd, changePwdLink);
            break;
        case constants.punishmentRequested:
            return emailNotificationCreators.punishment(data.punishment.why, APP_LINK);
            break;
        case constants.punishmentAccepted:
            return emailNotificationCreators.accepted(data.punishment.why);
            break;
        case constants.punishmentRejected:
            return emailNotificationCreators.rejected(data.punishment.why);
            break;
        case constants.punishmentIgnored:
            return emailNotificationCreators.ignored(data.punishment.why);
            break;
        case constants.notifyTrying:
            return emailNotificationCreators.trying(data.sender.username, data.punishment.why);
            break;
        case constants.notifyDone:
            return emailNotificationCreators.done(data.sender.username, data.punishment.why);
            break;
        case constants.notifyFailed:
            return emailNotificationCreators.failed(data.sender.username, data.punishment.why);
            break;
        case constants.punishmentGivenUp:
            return emailNotificationCreators.givenUp(data.sender.username, data.punishment.why);
            break;
        default:
            return null;
    }
}


function getUserPreferences(userId) {
    return new Promise((resolve, reject) => {
        Pref.findOne({ fk_user_id: userId }, (err, pref) => {
            if (err) {
                reject(err);
                return;
            } else if (!pref) {
                reject();
                return;
            };
            console.log(pref)
            resolve(pref);
        });
    });
}

function getUser(id) {
    return new Promise((resolve, reject) => {
        User.findById(id, (err, user) => {
            if (err) {
                reject(err);
                return;
            } else if (!user) {
                reject();
                return;
            };

            resolve(user);
        });
    });
}

function getPunishment(id) {
    return new Promise((resolve, reject) => {
        Punishment.findById(id, (err, punishment) => {
            if (err) {
                reject(err);
                return;
            } else if (!punishment) {
                reject();
                return;
            }

            resolve(punishment);
        })
    })
}



function getSignUpNotificationContent() {
    return emailNotificationCreators.signUpConfirmation();
}

function getPasswordResetConfirmationContent() {
    // TODO
}

function getNewPasswordNotificationContent() {
    // TODO
}

function getPunishmentRequestedNotificationContent(punisj) {
    Punishment.findById(punishmentId, (err, punishment) => {
        if (punishment) {
            return emailNotificationCreators.punishment(punishment.why, APP_LINK);
        }
    });
}

function getPunishmentAcceptedNotificationContent(punishmentId) {
    Punishment.findById(punishmentId, (err, punishment) => {
        if (punishment) {
            return emailNotificationCreators.accepted(punishment.why);
        }
    });
}

function getPunishmentRejectedNotificationContent(punishmentId) {
    Punishment.findById(punishmentId, (err, punishment) => {
        if (punishment) {
            return emailNotificationCreators.rejected(punishment.why);
        }
    });
}

function getPunishmentIgnoredNotificationContent(punishmentId) {
    Punishment.findById(punishmentId, (err, punishment) => {
        if (punishment) {
            return emailNotificationCreators.ignored(punishment.why);
        }
    });
}

function getPunishmentGivenUpNotificationContent(receiveingId, punishmentId) {
    User.findById(receiveingId, (err, user) => {
        if (user) {
            Punishment.findById(punishmentId, (err, punishment) => {
                if (punishment) {
                    return emailNotificationCreators.givenUp(user.username, punishment.why);
                }
            });
        }
    });
}


function inArray(target, array) {
    for (let i = 0; i < array.length; i++) {
        if (array[i] === target) {
            return true;
        }
    }
    return false;
}

module.exports = notifyUser;