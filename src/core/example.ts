import { DynamicForm } from "../model/dynform";

export class Example {
  public static convoLong: DynamicForm = {
    OrganisationName: "Lawyers Inc.",
    DynamicFields: [
      {
        Name: "Name",
        Description: "Name of the client",
        FieldType: "string",
      },
      {
        Name: "Address",
        Description: "Address of the client",
        FieldType: "string",
      },
      {
        Name: "Suburb",
        Description: "Suburb of the address of the client",
        FieldType: "string",
      },
      {
        Name: "Email",
        Description: "Email of the client",
        FieldType: "string",
      },
      {
        Name: "Mobile",
        Description: "Mobile number of the client",
        FieldType: "string",
      },
      {
        Name: "Marital status",
        Description: "Marital status of the client",
        FieldType: "Married|Single|Divorced|Widowed|Other",
      },
      {
        Name: "Spouse",
        Description: "Name of the spouse of the client, if client is married",
        FieldType: "string|null",
      },
      {
        Name: "seeking",
        Description: "Type of service required",
        FieldType: "Legal representation|Legal Advice|Other",
      },
      {
        Name: "description",
        Description: "Description of the service needed",
        FieldType: "string",
      },
      {
        Name: "referral",
        Description: "How did they hear about our business",
        FieldType: "string",
      },
    ],
  };

  public static convoShort: DynamicForm = {
    OrganisationName: "Lawyers Inc.",
    DynamicFields: [
      {
        Name: "Name",
        Description: "Name of the client",
        FieldType: "string",
      },
      {
        Name: "Mobile",
        Description: "Mobile number of the client",
        FieldType: "string",
      },
      {
        Name: "seeking",
        Description: "Type of service required",
        FieldType: "Legal representation|Legal Advice|Other",
      },
    ],
  };
}
