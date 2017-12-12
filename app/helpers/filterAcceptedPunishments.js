
// filter trough acc punishments to see if some are 
function filterAcceptedPunishments(acceptedPunishments, failedArray) {

    return acceptedPunishments.filter((punishment, index) => {

        if (punishment.deadline) {

            if (Date.now() > new Date(punishment.deadline).getTime()) {                
                failedArray.push(punishment);
                return false;
            }
            else return true;
        }

        else return true;
    });
}

module.exports = filterAcceptedPunishments;