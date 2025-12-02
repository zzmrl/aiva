# AIVA WebUI

Made using [SvelteKit](https://svelte.dev/docs/kit/introduction) and [Bun](https://bun.com/docs)

## Usage

### With Docker

```sh
docker build -t aiva-webui . # build the image
docker run -p 3000:3000 aiva-webui # run the container
```
This application expects a connection to the backend which may break if not running as a part of the entire compose stack.
