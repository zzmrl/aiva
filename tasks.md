1. Setup twilio
    * [x] Setup Account
    * [ ] Save API key
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
    * [ ] Setup integration tests
    * [ ] All working
8. Deploy & test
9. Monitor & maintain
    * [ ] Setup monitoring
    * [ ] Setup alerts
    * [ ] Setup backups
    * [ ] Setup CI/CD pipeline
10. Future:
    * [ ] Virtualize message cards (will be a performance issue when scaling)
