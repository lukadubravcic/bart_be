const emailNotificationCreator = require('../helpers/emailNotificationsCreator');

const User = require('../models/User');
const Punishment = require('../models/Punishment');
const Pref = require('../models/Pref');

const sendmail = require('sendmail')({
    /* silent: true, */

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


const notifyUser = (senderId, receivingEmail, punishmentId, notificationType, logId = null, newPwd = null) => {

    if (!receivingEmail) return false;

    let notificationContent = 0;
    let sender = 0;
    let punishment = 0;

    let queries = [];

    senderId ? queries.push(getUser(senderId)) : queries.push(null);
    punishmentId ? queries.push(getPunishment(punishmentId)) : queries.push(null);
    queries.push(getUserByMail(receivingEmail));

    return new Promise((resolve, reject) => {

        Promise.all(queries).then(queryData => {

            sender = queryData[0];
            punishment = queryData[1];
            receiver = queryData[2];

            if (inArray(notificationType, userPrefNotifications)) { // DONE, FAILED, TRYING

                getUserPreferences(receiver._id).then(pref => {
                    if (pref[notificationType]) {


                        notificationContent = createNotificationContent({
                            sender: sender,
                            receiver: receivingEmail,
                            punishment: punishment,
                            notificationType: notificationType,
                            logId: logId,
                        });
                    }

                    if (notificationContent) {
                        sendEmail(receivingEmail, notificationType, notificationContent).then(
                            sent => {
                                resolve(sent);
                            },
                            rejected => {
                                resolve(false);
                                console.log(rejected);
                            }
                        );
                    }
                }, err => {
                    console.log('err: get user prefs')
                    console.log(err)
                });
            } else { // ostale notifikacije

                notificationContent = createNotificationContent({
                    sender: sender,
                    receiver: receiver,
                    punishment: punishment,
                    notificationType: notificationType,
                    logId: logId,
                    newPwd: newPwd,
                });

                if (notificationContent) {
                    sendEmail(receivingEmail, notificationType, notificationContent).then(
                        sent => {
                            resolve(sent);
                        },
                        rejected => {
                            resolve(false);
                            console.log(rejected);
                        }
                    );
                };
            }

        }, err => {
            // failano dohvacanje podataka
            console.log('Promise query fail');
            resolve(false);
        });
    });
}

function createNotificationContent(data) {

    switch (data.notificationType) {

        case constants.signup:
            return emailNotificationCreator.signUpConfirmation();

        case constants.passwordResetConfirmation:
            const resetPwdLink = getResetPwdLink(data.logId);
            return emailNotificationCreator.passwordResetConfirmation(resetPwdLink);

        case constants.newPassword:
            return emailNotificationCreator.newPassword(data.newPwd, constants.APP_ADRRESS);

        case constants.punishmentRequested:
            return emailNotificationCreator.punishment(data.punishment.why, APP_LINK + '/punishment/accept?id=' + data.punishment._id, APP_LINK + '/punishment/reject?id=' + data.punishment._id);

        case constants.punishmentAccepted:
            return emailNotificationCreator.accepted(data.punishment.why);

        case constants.punishmentRejected:
            return emailNotificationCreator.rejected(data.punishment.why);

        case constants.punishmentIgnored:
            return emailNotificationCreator.ignored(data.punishment.why);

        case constants.notifyTrying:
            if (typeof data.sender.username !== 'undefined' && data.sender.username !== null) {
                return emailNotificationCreator.trying(data.sender.username, data.punishment.why);

            } else {
                return emailNotificationCreator.trying(data.sender.email, data.punishment.why);
            }

        case constants.notifyDone:
            if (typeof data.sender.username !== 'undefined' && data.sender.username !== null) {
                return emailNotificationCreator.done(data.sender.username, data.punishment.why);

            } else {
                return emailNotificationCreator.done(data.sender.email, data.punishment.why);
            }

        case constants.notifyFailed:
            return emailNotificationCreator.failed(data.sender.username, data.punishment.why);

        case constants.punishmentGivenUp:
            return emailNotificationCreator.givenUp(data.sender.username, data.punishment.why);

        case constants.confirmAccount:
            if (data.receiver.username === '') return emailNotificationCreator.confirmAccount('player', APP_LINK + '/users/confirm?id=' + data.receiver._id);
            else return emailNotificationCreator.confirmAccount(data.receiver.username, APP_LINK + '/users/confirm?id=' + data.receiver._id);

        default:
            return null;
    }
}

function getMailSubject(notificationType) {
    switch (notificationType) {

        case constants.signup:
            return 'Signing up';

        case constants.passwordResetConfirmation:
            return 'Confirmation for password reset';

        case constants.newPassword:
            return 'New password';

        case constants.punishmentRequested:
            return 'New punishment';

        case constants.punishmentAccepted:
            return 'Punishment accepted';

        case constants.punishmentRejected:
            return 'Punishment rejected';

        case constants.punishmentIgnored:
            return 'Punishment ignored';

        case constants.punishmentGivenUp:
            return 'Punishment given up';

        case constants.notifyTrying:
            return 'Punishment tried';

        case constants.notifyDone:
            return 'Punishment finished';

        case constants.notifyFailed:
            return 'Punishment failed';

        case constants.confirmAccount:
            return 'Confirm your account';

        default:
            return null;
    }
}

function sendEmail(receiverMail, notificationType, mailContent) {

    return new Promise((resolve, reject) => {
        let from = BART_MAIL;
        let to = receiverMail;
        let subject = getMailSubject(notificationType);

        console.log('----------------------------------------------------------------------------');
        console.log(`Mail from: ${from}`);
        console.log(`Mail to: ${receiverMail}`);
        console.log(`Mail subject: ${subject}`);
        console.log('Content: \n\n' + mailContent + '\n')
        console.log('----------------------------------------------------------------------------');

        sendmail({
            from: from,
            to: 'lukadubravcic@yahoo.com', //receiverMail,
            subject: subject,
            html: mailContent,
        }, function (err, reply) {
            if (err) resolve(false);
            if (reply) resolve(true);
        });
    });
}

function getResetPwdLink(logId) {
    return constants.APP_ADRRESS + 'users/reset/' + logId;
}

function getUserPreferences(userId) {
    return new Promise((resolve, reject) => {
        Pref.findOne({ fk_user_uid: userId }, (err, pref) => {
            if (err) {
                reject(err);
                return;
            } else if (!pref) {
                resolve(new Pref());
                return;
            };
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
                reject('User not found.');
                return;
            };

            resolve(user);
        });
    });
}

function getUserByMail(mail) {
    return new Promise((resolve, reject) => {
        User.findOne({ email: mail }, (err, user) => {
            if (err) {
                reject(err);
                return;
            } else if (!user) {
                resolve(mail);
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
                reject('Punishment not found.');
                return;
            }

            resolve(punishment);
        })
    })
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