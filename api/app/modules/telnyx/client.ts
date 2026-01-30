import Telnyx from "telnyx";
import { config } from "aiva-api/app";

const client = new Telnyx({
  apiKey: config.TELNYX_API_KEY,
  publicKey: config.TELNYX_PUBLIC_KEY,
});

export default client;
