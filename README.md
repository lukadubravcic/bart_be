## API points for Bart

## User endpoints:

 - get (/) - return user info if jwt token is provided
 - post (/login) - on email and password returns jwt token
 - post (/register) - on user data, creates new user and sends created data back


## Game endpoints:

- get (/game) - returns default (punishment with closest expiration) for specific user