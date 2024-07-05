export interface DynamicForm {
  OrganisationName: string;
  DynamicFields: DynamicField[];
}

export interface DynamicField {
  Name: string;
  FieldType: string;
  Description: string;
}
