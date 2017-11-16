
// filter trough acc punishments to see if some are 
function filterAcceptedPunishments(acceptedPunishments) {

    return acceptedPunishments.filter((punishment, index) => {

        if (punishment.deadline) {

            if (Date.now() > new Date(punishment.deadline)) return false;
            else return true;
        }
        
        else return true;
    });
}

module.exports = filterAcceptedPunishments;