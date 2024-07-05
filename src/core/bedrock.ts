import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message,
} from "@aws-sdk/client-bedrock-runtime";
import { AWS } from "./aws";
import { AITranscript } from "./intaker";
import { ConvoConfiguration } from "./convo-config";

export class Bedrock {
  private convoConfig: ConvoConfiguration;
  constructor(convoConfig: ConvoConfiguration) {
    this.convoConfig = convoConfig;
  }

  async chat(transcript: AITranscript[]): Promise<string | undefined> {
    var client = new BedrockRuntimeClient({
      region: AWS.region,
      credentials: {
        accessKeyId: AWS.accessKeyId,
        secretAccessKey: AWS.secretAccessKey,
      },
    });

    const modelId = "meta.llama3-8b-instruct-v1:0";
    const conversation: Message[] = [
      {
        role: "user",
        content: [
          {
            text: "Hello?",
          },
        ],
      },
    ];

    for (const message of transcript) {
      conversation.push({
        role: message.isHuman ? "user" : "assistant",
        content: [
          {
            text: message.text,
          },
        ],
      });
    }

    let systemCommand = `You are a ${this.convoConfig.getAIAssistant()}, a virtual agent from ${
      this.convoConfig.convoConfig.dynForm.OrganisationName
    }, that collects information for client intake purposes. `;
    systemCommand += `Collect all information and maintain a friendly conversation. Once you have finished collecting all the information, finish the conversation with the phrase '${this.convoConfig.getFinalToken()}'. 
    You need to collect the following information: \n `;

    for (const field of this.convoConfig.convoConfig.dynForm.DynamicFields) {
      systemCommand += `-'${field.Name}' <${field.FieldType}> ${field.Description}. \n`;
    }
    systemCommand += `You have been connected on the phone with the person answering the survey, this person only speaks ${this.convoConfig.getLanguageName()} (${this.convoConfig.getTranscribeLanguage()}), start the conversation now.`;

    const command = new ConverseCommand({
      modelId: modelId,
      messages: conversation,
      system: [
        {
          text: systemCommand,
        },
      ],
    });

    const response = await client.send(command);
    if (response?.output?.message?.content?.length) {
      return response?.output?.message?.content[0].text;
    }
    return undefined;
  }

  async analyseChat(transcript: AITranscript[]): Promise<any> {
    var client = new BedrockRuntimeClient({
      region: AWS.region,
      credentials: {
        accessKeyId: AWS.accessKeyId,
        secretAccessKey: AWS.secretAccessKey,
      },
    });

    const modelId = "meta.llama3-8b-instruct-v1:0";

    let systemCommand = `You are an agent that analyses the transcript of a conversation between a ${this.convoConfig.getAIAssistant()} and a client for onboarding purposes, extracts key data and provides results in JSON format.\n`;
    systemCommand += `Analyse the transcript provided by the user and extract the following data in a JSON object: \n`;

    if (this.convoConfig.getLanguageName().trim().toLowerCase() !== "english") {
      systemCommand = `You are an agent that translates and analyses the transcript of a conversation between a ${this.convoConfig.getAIAssistant()} and a client for onboarding purposes, extracts key data and provides results in JSON format.\n`;
      systemCommand += `The transcript is in ${this.convoConfig.getLanguageName()} (${this.convoConfig.getTranscribeLanguage()}), translate the following trasncript to english,`
      systemCommand += `analyse it and finally extract the following data in a JSON object: \n`;
    }

    for (const field of this.convoConfig.convoConfig.dynForm.DynamicFields) {
      systemCommand += `-'${field.Name}' <${field.FieldType}> ${field.Description}. \n`;
    }

    let transcriptToAnalyse = "";
    for (const item of transcript) {
      transcriptToAnalyse += item.isHuman
        ? "Client: "
        : `${this.convoConfig.getAIAssistant()}: `;
      transcriptToAnalyse += `${item.text} \n`;
    }

    const conversation: Message[] = [
      {
        role: "user",
        content: [
          {
            text: transcriptToAnalyse,
          },
        ],
      },
    ];

    const command = new ConverseCommand({
      modelId: modelId,
      messages: conversation,
      system: [
        {
          text: systemCommand,
        },
      ],
    });

    const response = await client.send(command);
    let result: string | undefined;

    if (response?.output?.message?.content?.length) {
      result = response?.output?.message?.content[0].text;
    }
    if (result) {
      let jsonResult = result;
      jsonResult = jsonResult.substring(jsonResult.indexOf("{"));
      jsonResult = jsonResult.substring(0, jsonResult.indexOf("}") + 1).trim();
      console.log(jsonResult);
      // Parse result as json
      return JSON.parse(jsonResult);
    }
    return undefined;
  }
}
