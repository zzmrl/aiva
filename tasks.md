# AIVA Tasklist

## MVP

1. Setup twilio
    * [x] Setup Account
    * [x] Save API key
2. Setup project directory and compose.yaml
   * [x] services
        * [x] backend - node.js, express
        * [x] db - postgres
        * [x] webapp - html/svelte
        * [x] nginx
    * [x] secrets
    * [x] volumes
    * [ ] revisit after setting up everything else
    * [ ] healthchecks if time
3. Setup database
    * [x] initialization
    * [x] messages table
4. Build node/express/typescript backend
    * [x] database connection
    * [x] /call endpoint
    * [x] /sms endpoint
    * [x] /messages endpoint for returning saved messages
5. Setup simple webapp
    * [x] create sveltekit static app
    * [x] call api and render list to the page
    * [x] stylize
    * [x] gradient bg
6. Setup NGINX
7. Test
    * [x] Setup integration tests
    * [x] All working
8. Setup Conversation
    * [x] Send entire conversation to LLM for text messages
    * [x] Update UI to display messages as back and forth conversations
    * [x] Implement a voice conversation
9. Deploy & test

## Improve and Grow

* UI
  * [ ] Use websockets for real-time updates
  * [ ] Outbound messaging — initiate or reply from the dashboard
  * [ ] Contact names — associate names with phone numbers
  * [ ] Message search — search past conversations by content or phone number
  * [ ] Channel label — distinguish voice vs. SMS messages in the conversation view
* API
  * [ ] Implement pagination for messages endpoint
  * [ ] Use RCS messaging
  * [ ] Webhook idempotency — deduplicate Twilio retries to prevent duplicate messages
  * [ ] MCP tools cache invalidation — refresh tools list periodically or on-demand instead of once at startup
* AI / Voice
  * [ ] Per-number system prompts — configure different personas per Twilio number via DB/config
* Monitor & maintain
  * [ ] Setup monitoring
  * [ ] Setup alerts
  * [ ] Setup backups
  * [ ] Setup CI/CD pipeline
