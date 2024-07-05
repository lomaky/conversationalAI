import { Component, OnInit, ɵɵsetComponentScope } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterOutlet } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import MicrophoneStream from "microphone-stream";
import { from } from "rxjs";
import { Intaker } from "../core/intaker";
import { Bedrock } from "../core/bedrock";
import { Example } from "../core/example";
import { DynamicForm } from "../model/dynform";
import { ConvoConfiguration } from "../core/convo-config";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, MatCardModule, RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  title = "Onboarder";

  transcribe: string | undefined;
  dynForm: DynamicForm | undefined;
  convoConfig: ConvoConfiguration | undefined;
  parsedData: any;
  status: "ready" | "ai" | "listening" | "processing" | "completed" = "ready";
  private microphoneStream: any;
  private intaker: Intaker | undefined;

  //https://codesandbox.io/p/sandbox/formbuilder-react-forked-mjzr3c

  constructor(private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((params) => {
      // Read questionnaire from base64 encoded json. Example:
      // eyJBSUFzc2lzdGFudE5hbWUiOiJKYW5lIiwiT3JnYW5pc2F0aW9uTmFtZSI6Ikxhd3llcnMgSW5jLiIsIkR5bmFtaWNGaWVsZHMiOlt7Ik5hbWUiOiJEb2dfTmFtZSIsIkRlc2NyaXB0aW9uIjoiTmFtZSBvZiB0aGUgY2xpZW50J3MgZG9nIiwiRmllbGRUeXBlIjoic3RyaW5nIn1dfQ==
      if (params.get("id")) {
        try {
          this.dynForm = JSON.parse(atob(params.get("id")!.toString()));
        } catch (error) {
          console.log(error);
        }
      } else {
        // Change to Example.convoShort for debug
        this.dynForm = Example.convoShort;
      }
    });
  }

  async record(
    voice:
      | "en-AU|en-AU|Olivia|english"
      | "fr-FR|fr-FR|Lea|french"
      | "de-DE|de-DE|Vicki|german"
      | "es-US|es-US|Lupe|spanish"
  ): Promise<void> {
    if (!this.dynForm) {
      alert("No configuration error");
    }

    this.convoConfig = new ConvoConfiguration({
      voice: voice,
      dynForm: this.dynForm!,
    });

    this.status = "ready";
    this.parsedData = undefined;
    if (this.microphoneStream) {
      await this.stop();
    }
    if (this.intaker) {
      this.intaker = undefined;
    }
    this.microphoneStream = new MicrophoneStream();
    this.microphoneStream.setStream(
      await window.navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      })
    );

    this.intaker = new Intaker(this.convoConfig);
    this.intaker.isAIProcessing().subscribe((isAi) => {
      this.status = isAi ? "ai" : "listening";
    });
    this.intaker.getTranscript().subscribe((str) => {
      this.transcribe = str;
    });
    from(this.intaker.intake(this.microphoneStream)).subscribe({
      next: async () => {
        this.status = "processing";
        const finalTranscript = this.intaker!.finalTranscript;
        const bedrock = new Bedrock(this.convoConfig!);
        this.parsedData = JSON.stringify(
          await bedrock.analyseChat(finalTranscript)
        );
        this.status = "completed";
      },
    });
  }

  async stop(): Promise<void> {
    this.microphoneStream.stop();
    this.microphoneStream.destroy();
    this.microphoneStream = undefined;
  }
}
