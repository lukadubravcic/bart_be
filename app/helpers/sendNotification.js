const emailNotificationCreator = require('../helpers/emailNotificationsCreator');

const User = require('../models/User');
const Punishment = require('../models/Punishment');
const Pref = require('../models/Pref');

const sendmail = require('sendmail')/* ({
    logger: {
        debug: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    }
}); */

const constants = require('../config/constants');

const BART_MAIL = constants.BART_MAIL // 'Bart@barted.com';
const APP_LINK = constants.APP_ADRRESS //'localhost:8000';

const userPrefNotifications = [constants.notifyFailed, constants.notifyDone, constants.notifyTrying];


const notifyUser = (senderId, receivingEmail, punishmentId, notificationType) => {

    if (!receivingEmail) return;

    let mailSent = null; 

    let notificationContent = 0;
    let sender = 0;
    let punishment = 0;

    let queries = [];

    senderId ? queries.push(getUser(senderId)) : queries.push(null);
    punishmentId ? queries.push(getPunishment(punishmentId)) : queries.push(null);
    queries.push(getUserByMail(receivingEmail));


    Promise.all(queries).then(queryData => {

        sender = queryData[0];
        punishment = queryData[1];
        receiver = queryData[2];

        if (inArray(notificationType, userPrefNotifications)) { // DONE, FAILED, TRYING

            getUserPreferences(receiverMail).then((pref) => {
                if (pref[notificationType]) {
                    notificationContent = createNotificationContent({
                        sender: sender,
                        receiver: receiver,
                        punishment: punishment,
                        notificationType: notificationType
                    });
                }
                if (notificationContent) {
                    mailSent = sendEmail(receivingEmail, notificationType, notificationContent);                    
                }
            });
        } else { // ostale notifikacije

            notificationContent = createNotificationContent({
                sender: sender,
                receiver: receiver,
                punishment: punishment,
                notificationType: notificationType
            });

            if (notificationContent) {
                mailSent = sendEmail(receivingEmail, notificationType, notificationContent);
            };           
        }
        console.log('Uspjesan mail: ' + mailSent);
        return mailSent;
    }, reason => {
        // failani promise
        console.log('Promise query fail');
        return mailSent;
    });
}

function createNotificationContent(data) {

    switch (data.notificationType) {

        case constants.signup:
            return emailNotificationCreator.signUpConfirmation();

        case constants.passwordResetConfirmation:
            const resetPwdLink = getResetPwdLink(data);
            return emailNotificationCreator.passwordResetConfirmation(resetPwdLink);

        case constants.newPassword:
            return emailNotificationCreator.newPassword(temporaryPwd, changePwdLink);

        case constants.punishmentRequested:
            return emailNotificationCreator.punishment(data.punishment.why, APP_LINK + "/punishment/accept?id=" + data.punishment._id);

        case constants.punishmentAccepted:
            return emailNotificationCreator.accepted(data.punishment.why);

        case constants.punishmentRejected:
            return emailNotificationCreator.rejected(data.punishment.why);

        case constants.punishmentIgnored:
            return emailNotificationCreator.ignored(data.punishment.why);

        case constants.notifyTrying:
            return emailNotificationCreator.trying(data.sender.username, data.punishment.why);

        case constants.notifyDone:
            return emailNotificationCreator.done(data.sender.username, data.punishment.why);

        case constants.notifyFailed:
            return emailNotificationCreator.failed(data.sender.username, data.punishment.why);

        case constants.punishmentGivenUp:
            return emailNotificationCreator.givenUp(data.sender.username, data.punishment.why);

        default:
            return null;
    }
}

function getMailSubject(notificationType) {
    switch (notificationType) {

        case 'signup':
            return 'Signing up';

        case 'password_reset_confirmation':
            return 'Confirmation for password reset';

        case 'new_password':
            return 'New password';

        case 'punishment_requested':
            return 'New punishment';

        case 'punishment_accepted':
            return 'Punishment accepted';

        case 'punishment_rejected':
            return 'Punishment rejected';

        case 'punishment_ignored':
            return 'Punishment ignored';

        case 'punishment_given_up':
            return 'Punishment given up';

        case 'notify_trying':
            return 'Punishment tried';

        case 'notify_done':
            return 'Punishment finished';

        case 'notify_failed':
            return 'Punishment failed';

        default:
            return null;
    }
}

function sendEmail(receiverMail, notificationType, mailContent) {

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
        to: receiverMail,
        subject: subject,
        html: mailContent,
    }, function (err, reply) {
        if (err) return false;
        if (reply) return true;
    });
}

function getResetPwdLink(data) {
    return constants.APP_ADRRESS + '/reset/' + data.receiver._id;
}

function getUserPreferences(userId) {
    return new Promise((resolve, reject) => {
        Pref.findOne({ fk_user_id: userId }, (err, pref) => {
            if (err) {
                reject(err);
                return;
            } else if (!pref) {
                reject(new Pref());
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