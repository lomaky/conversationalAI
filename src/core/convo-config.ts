import { DynamicForm } from "../model/dynform";

export interface Configuration {
  dynForm: DynamicForm;
  // transcription [0] | voice language [1] | neural voice [2] | language name [3]
  voice:
    | "en-AU|en-AU|Olivia|english"
    | "fr-FR|fr-FR|Lea|french"
    | "de-DE|de-DE|Vicki|german"
    | "es-US|es-US|Lupe|spanish"
}

export class ConvoConfiguration {
  public convoConfig: Configuration;

  constructor(convoConfig: Configuration) {
    this.convoConfig = convoConfig;
  }

  getTranscribeLanguage() {
    return this.convoConfig.voice.split("|")[0].trim();
  }

  getPollyLanguage() {
    return this.convoConfig.voice.split("|")[1].trim();
  }

  getAIAssistant() {
    return this.convoConfig.voice.split("|")[2].trim();
  }

  getLanguageName() {
    return this.convoConfig.voice.split("|")[3].trim();
  }

  getFinalToken() {
    switch (this.getTranscribeLanguage()) {
      case "en-AU":
        return "Thank you for your time today";
      case "fr-FR":
        return "Merci pour votre temps aujourd'hui";
      case "de-DE":
        return "Vielen Dank für Ihre Zeit heute";
      case "es-US":
        return "Gracias por tu tiempo hoy";
      case "zh-CN":
        return "Gǎnxiè nín jīntiān chōuchū shíjiān";
      default:
        return "Thank you for your time today";
    }
  }
}
