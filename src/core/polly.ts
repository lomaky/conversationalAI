import { PollyClient, SynthesizeSpeechCommand, VoiceId } from "@aws-sdk/client-polly";
import { AWS } from "./aws";
import { ConvoConfiguration } from "./convo-config";

export class Polly {
  private convoConfig: ConvoConfiguration;
  private pollyClient;
  private isPlaying = false;

  constructor(convoConfig: ConvoConfiguration) {
    this.convoConfig = convoConfig;

    // Initialize polly
    this.pollyClient = new PollyClient({
      region: AWS.region,
      credentials: {
        accessKeyId: AWS.accessKeyId,
        secretAccessKey: AWS.secretAccessKey,
      },
    });
  }

  async synthetise(result: string): Promise<void> {
    const command = new SynthesizeSpeechCommand({
      OutputFormat: "mp3",
      SampleRate: "8000",
      Text: result,
      Engine: "neural",
      TextType: "text",
      VoiceId: this.convoConfig.getAIAssistant() as VoiceId,
    });
    const response = await this.pollyClient.send(command);

    // Play Speech
    const audioContext = new AudioContext();
    const pollyBufferSourceNode = audioContext.createBufferSource();

    pollyBufferSourceNode.buffer = await audioContext.decodeAudioData(
      (
        await response.AudioStream!.transformToByteArray()
      ).buffer
    );

    pollyBufferSourceNode.connect(audioContext.destination);
    pollyBufferSourceNode.playbackRate.value = 1.1;
    pollyBufferSourceNode.detune.value = -100;

    pollyBufferSourceNode.addEventListener("ended", (event) => {
      this.isPlaying = false;
    });
    this.isPlaying = true;
    pollyBufferSourceNode.start();
    console.log(result);

    while (this.isPlaying) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}
