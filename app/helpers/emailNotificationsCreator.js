module.exports = {
    signUpConfirmation: () => 'Welcome! Now go and punish someone.',
    passwordResetConfirmation: resetPwdLink => '<a href="' + resetPwdLink + '">[Click]</a> to reset your password. New temporary password will be sent to this e-mail.',
    newPassword: (temporaryPwd, changePwdLink) => 'Your password has been reset. Your new temporary password is <b>' + temporaryPwd + '</b>. Please <a href="' + changePwdLink + '">[change it]</a> ASAP. Or else.', // TODO CHANGE PASSWORD ROUTE
    punishment: (punishmentDescription, link, rejectLink) => 'Punishment description: "' + punishmentDescription + '" <a href="' + link + '">ACCEPT</a> <a href="' + rejectLink + '">REJECT</a>',
    accepted: punishmentDescription => ' Your punishment "' + punishmentDescription + '" has been accepted. YES!',
    rejected: punishmentDescription => 'Your punishment "' + punishmentDescription + '" has been rejected. Booo!',
    ignored: punishmentDescription => 'Your request for punishment "' + punishmentDescription + '" has expired. This deserves punishment!',
    trying: (username, punishmentDescription) => username + ' is trying to complete your punishment. ' + punishmentDescription,
    done: (username, punishmentDescription) => username + ' has completed punishment. ' + punishmentDescription,
    failed: (username, punishmentDescription) => username + ' has failed: "' + punishmentDescription + '".',
    givenUp: (username, punishmentDescription) => username + ' has given up completing punishment: "' + punishmentDescription + '".',
    confirmAccount: (username, confirmLink) => 'Hello ' + username + '. Click on this <a href"' + link + '">LINK</a> to complete your registration.' 
};