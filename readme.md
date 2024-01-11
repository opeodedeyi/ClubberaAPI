# Project Title

## Description

A brief description of what this project does and who it's for.


## Installation

Provide steps on how to install and setup your project.


## Usage

Instructions on how to use your project.


## Technologies Used

- Express.js
- JSON Web Token (JWT)
- bcrypt.js
- crypto
- Google Auth Library
- AWS S3


## Cloud Services

- AWS S3


## Environment Variables

To run this project, you will need to add the following environment variables to your .env file:

`JWT_SECRET_KEY`
`EMAIL_CONFIRM_SECRET_KEY`
`ADMIN_SECRET_KEY`
`NODEMAILER_EMAIL`
`NODEMAILER_PASS`
`AWS_ACCESS_KEY_ID`
`AWS_SECRET_ACCESS_KEY`
`AWS_REGION`
`AWS_BUCKET_NAME`
`GOOGLE_CLIENT_ID`
`GOOGLE_CLIENT_SECRET`
`MONGODB_ATLAS_URI`
`MONGODB_ATLAS_URI_PROD`
`MONGODB_ATLAS_URI_MAIN`

You can create a `.env` file in the root directory of the project and add these variables like so:

```properties
JWT_SECRET_KEY=your_value
EMAIL_CONFIRM_SECRET_KEY=your_value
ADMIN_SECRET_KEY=your_value
```


## APIs Used

Most api usage were done on the frontend.
- Google Auth API


## Tasks To Be Done

- [ ] login with google and setting profile photo using AWS.
- [ ] Renaming the fields in the group schema to closely relate to what it will be named on the frontend and make migrations also.
- [ ] When users try to sign up or login, success or error message tellig them exactly what happened to show up
- [ ] Feature to add an event to a group, and users should be able to create an event if they are creators of that community, delete, and update.
- [ ] Regarding the event, a seperate route to get all upcoming events, past events that have ended.
- [ ] Also, when gettig all upcoming events it should be sorted by showing the events with the closest dates first and the ones starting later show later.


## Known bugs

when trying to create a community it fails. it only works when i use postman. if anyone can help review what i did and make improvements, please 


## Contributing

Email me, lets talk about contribution


## Contact

opeyemiodedeyi@gmail.com


## Github note

- [git add .](#gitadd)
- [git commit -m "any comment"](#Initialcommit)
- [git push -u origin master](#gitpush)


## deploy to heroku

- [git push heroku main](#herokupush)


## Installation

[npm run dev]