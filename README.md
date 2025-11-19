# Automate.It Virtual Assistant (AIVA)

A virtual assistant application for the automate.it platform.

For now, it records transcribed phone calls and text messages to a database.
We plan to expand this with tool calls and other useful features as we build.

## Requirements

Ensure you have all necessary secret files:

* `./secrets/postgres_password`
* `./secrets/postgres_user`

They can contain any values but they should be kept static once initialized.

## Components
* Processing Backend and API
    * Node/express API to handle webhook responses
    * typescript
    * Twilio
        * handles text/call (including transcription)
        * Has node and python libraries
        * Webhooks route requests to our backend
        * Mature solution with many potentially useful features
* Persistence
    * postgres SQL
    * Supabase
        * Auth: generate Token with supabase
        * research .5-1 day to find best practices for supabase security
* Web App
    * sveltekit static render or simple .html
* NGINX Reverse Proxy
* Configure and launch with Docker compose
* Deploy to AWS?

### Alternative AWS/cloud-centric solution

* Processing Backend and API
    * Lambda and APIGateway to handle webhook responses
* Persistence
    * DynamoDB simple table that stores records of phone number and message
* Web App
    * S3 hosting a simple HTML page to display saved messages
* Serverless CLI deploy


## Links

* https://www.twilio.com/docs/voice/tutorials/how-to-record-phone-calls/node
* https://www.twilio.com/docs/messaging/tutorials/how-to-receive-and-reply/node-js

## Considerations

* We'll need to consider legal compliance for anything regarding recording
voice over the phone, which varies from state to state.
