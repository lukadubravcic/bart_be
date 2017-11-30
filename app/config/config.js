module.exports = {
    DB: {
        name: "Dubra",
        pwd: "12345"
    },
    events: {
        loginEvent: {
            index: 0,
            description: 'LOGIN'
        },
        logoutEvent: {
            index: 1,
            description: 'LOGOUT'
        },
        resetPasswordEvent: {
            index: 2,
            description: 'PASSWORD_RESET'
        }
    }
}