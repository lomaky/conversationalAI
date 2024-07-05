import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  StartStreamTranscriptionCommandOutput,
  Alternative,
  LanguageCode,
} from "@aws-sdk/client-transcribe-streaming";
import { Subject, Observable, delay } from "rxjs";
import mitt from "mitt";

(window as any).process = require("process");

import { Buffer } from "buffer";
if (!window.Buffer) {
  window.Buffer = Buffer;
}

import MicrophoneStream from "microphone-stream";
import { AWS } from "./aws";
import { Bedrock } from "./bedrock";
import { Polly } from "./polly";
import { ConvoConfiguration } from "./convo-config";

const SAMPLE_RATE = 44100;
const ENCODING = "pcm";

export interface AITranscript {
  isHuman: boolean;
  text: string;
}

export class Intaker {
  private transcribeClient;

  private isAIing: boolean = false;
  private isComplete: boolean = false;
  private console$ = new Subject<string>();
  private ai$ = new Subject<boolean>();
  private structuredTranscript: Alternative[] = [];
  private convoConfig: ConvoConfiguration;
  public finalTranscript: AITranscript[] = [];

  timeouts: any[] = [];
  emitter = mitt();

  constructor(convoConfig: ConvoConfiguration) {
    this.convoConfig = convoConfig;
    // Initialize transcribe
    this.transcribeClient = new TranscribeStreamingClient({
      region: AWS.region,
      credentials: {
        accessKeyId: AWS.accessKeyId,
        secretAccessKey: AWS.secretAccessKey,
      },
    });
  }

  async runAI(): Promise<void> {
    this.console$.next("...");
    this.isAIing = true;
    this.ai$.next(this.isAIing);
    console.log(`AI...`);
    let transcript = "";
    for (const alternative of this.structuredTranscript) {
      if (alternative.Items) {
        for (const item of alternative.Items) {
          transcript += ` ${item.Content}`;
        }
      }
    }
    // clear last transcript
    this.structuredTranscript = [];
    // Add to final transcript
    if (transcript.length) {
      this.finalTranscript.push({ isHuman: true, text: transcript });
    }
    // call AI
    const bedrock = new Bedrock(this.convoConfig);
    const aiResponse = (await bedrock.chat(this.finalTranscript)) ?? "hmm...";
    this.finalTranscript.push({ isHuman: false, text: aiResponse });
    await new Polly(this.convoConfig).synthetise(aiResponse);
    // End of the conversation
    if (
      aiResponse
        .trim()
        .toLowerCase()
        .includes(this.convoConfig.getFinalToken().trim().toLowerCase())
    ) {
      this.isComplete = true;
    }
    console.log(`Waiting...`);
    this.isAIing = false;
    this.ai$.next(this.isAIing);
  }

  async intake(microphoneStream: any): Promise<void> {
    // Capture emmitter
    this.emitter.on("*", (e) => {
      // clear all timeouts
      for (const timeoutId of this.timeouts) {
        console.log(`Clear Timeout: ${timeoutId}`);
        clearTimeout(timeoutId);
      }      
      // Run AI on timeout
      let timeoutId = setTimeout(() => {
        // Continue to interview
        if (!this.isComplete) {
          this.timeouts = [];
          this.runAI().then(() => {});
        }
        // Close mic when completed.
        else {
          microphoneStream.stop();
          microphoneStream.destroy();
          microphoneStream = undefined;
        }
      }, 1500);
      console.log(`Timeout: ${timeoutId}`)
      this.timeouts.push(timeoutId);
    });

    const getAudioStream = async function* () {
      for await (const chunk of microphoneStream) {
        if (chunk.length <= SAMPLE_RATE) {
          yield {
            AudioEvent: {
              AudioChunk: encodePCMChunk(chunk),
            },
          };
        }
      }
    };

    this.structuredTranscript = [];
    this.finalTranscript = [];
    await this.runAI();

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: this.convoConfig.getTranscribeLanguage() as LanguageCode,
      MediaEncoding: ENCODING,
      MediaSampleRateHertz: SAMPLE_RATE,
      ShowSpeakerLabel: true,
      AudioStream: getAudioStream(),
    });
    const response = await this.transcribeClient.send(command);
    return await this.onStart(response);
  }

  private async onStart(
    response: StartStreamTranscriptionCommandOutput
  ): Promise<void> {
    if (response.TranscriptResultStream) {
      let lengthControl = 0;
      for await (const event of response.TranscriptResultStream) {
        if (!this.isAIing && event.TranscriptEvent) {
          // Get multiple possible results
          const results = event?.TranscriptEvent?.Transcript?.Results;
          if (results) {
            results.map((result) => {
              (result.Alternatives || []).map((alternative) => {
                if (alternative?.Transcript) {
                  if (alternative.Transcript.length >= lengthControl) {
                    this.structuredTranscript.pop();
                  }
                  lengthControl = alternative.Transcript.length;
                  this.structuredTranscript.push(alternative);
                  // Trigger notifications
                  this.console$.next(alternative.Transcript);
                  this.emitter.emit(alternative.Transcript);
                }
              });
            });
          }
        }
      }
    }
  }

  getTranscript(): Observable<string> {
    return this.console$.asObservable().pipe(delay(1));
  }

  isAIProcessing(): Observable<boolean> {
    return this.ai$.asObservable().pipe(delay(1));
  }
}

export function encodePCMChunk(chunk: any) {
  const input = MicrophoneStream.toRaw(chunk);
  let offset = 0;
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return Buffer.from(buffer);
}
